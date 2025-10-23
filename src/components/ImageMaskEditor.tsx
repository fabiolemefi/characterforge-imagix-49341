import { useState, useRef, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Undo, RotateCcw, X, Circle as LucideCircle, PaintBucket, Loader2 } from "lucide-react";
import { Stage, Layer, Image as KonvaImage, Circle, Path, Line, Rect, Transformer, Group } from 'react-konva';
import Konva from 'konva';
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageMaskEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onGenerateCombination: (processedCanvasUrl: string, modifiedCanvasUrl: string) => Promise<void>;
  onModalClose?: () => void;
}

interface BezierPoint {
  x: number;
  y: number;
}

interface BezierCurve {
  points: BezierPoint[];
  color: string;
  closed?: boolean;
}

interface CircleShape {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

// Função para detectar se o cursor está próximo de fechar um laço
function isNearFirstPoint(currentCurve: BezierCurve, pos: { x: number; y: number }): boolean {
  if (currentCurve.points.length < 3) return false;

  const firstPoint = currentCurve.points[0];
  const distanceToStart = Math.sqrt(
    Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
  );

  return distanceToStart < 20;
}

// Função para criar caminho preenchido (shape fechado)
function generateFilledPath(points: BezierPoint[]): string {
  if (points.length < 3) return '';

  let path = `M ${points[0].x} ${points[0].y}`;

  // Criar linhas retas entre pontos (mais simples para formas fechadas)
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }

  // Fechar o caminho e preencher
  path += ' Z';
  return path;
}

export function ImageMaskEditor({ open, onOpenChange, imageUrl, onGenerateCombination, onModalClose }: ImageMaskEditorProps) {
  const [bezierCurves, setBezierCurves] = useState<BezierCurve[]>([]);
  const [circleShapes, setCircleShapes] = useState<CircleShape[]>([]);
  const [selectedTool, setSelectedTool] = useState<'bezier' | 'circle'>('bezier');
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [modalSize, setModalSize] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Estados para criação de círculos por drag
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);
  const [circleStartPos, setCircleStartPos] = useState({ x: 0, y: 0 });
  const [circlePreview, setCirclePreview] = useState<CircleShape | null>(null);

  // Estado para loading durante geração
  const [generating, setGenerating] = useState(false);

  // Estado para UX melhorada
  const [pointsVisible, setPointsVisible] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (imageUrl && open) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      img.onload = () => {
        setOriginalImage(img);

        // Ajustar tamanho do modal para exato da imagem + padding
        const maxWidth = 1200;
        const maxHeight = 800;
        const imgAspect = img.width / img.height;
        const modalAspect = maxWidth / maxHeight;

        let modalWidth, modalHeight;
        if (imgAspect > modalAspect) {
          modalWidth = Math.min(img.width, maxWidth);
          modalHeight = modalWidth / imgAspect;
        } else {
          modalHeight = Math.min(img.height, maxHeight);
          modalWidth = modalHeight * imgAspect;
        }

        setModalSize({ width: modalWidth, height: modalHeight });
        setBezierCurves([]); // Resetar curvas ao carregar nova imagem
      };
    }
  }, [imageUrl, open]);

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!originalImage || selectedTool !== 'circle') return;

    const stage = e.target.getStage();
    if (!stage) return;

    // Verificar se clicou em um círculo existente
    const clickedOnCircle = e.target.getClassName() === 'Circle' && e.target.getAttrs().fill === '#FFFF00CC';

    // Só iniciar criação de círculo se clicou na área vazia/imagem
    if (!clickedOnCircle) {
      const pos = stage.getPointerPosition();
      if (!pos) return;

      setIsCreatingCircle(true);
      setCircleStartPos({ x: pos.x, y: pos.y });
      setCirclePreview({
        id: `preview-${Date.now()}`,
        x: pos.x,
        y: pos.y,
        radius: 1,
        color: 'yellow'
      });
    }

    // Se clicou em círculo, a lógica de seleção já acontece no onClick do Circle
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!originalImage) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Primeiro, verificar se devemos fechar uma curva (prioritário sobre outros cliques)
    if (selectedTool === 'bezier') {
      const existingCurveIndex = bezierCurves.findIndex(curve => curve.color === 'red');

      if (existingCurveIndex >= 0) {
        const currentCurve = bezierCurves[existingCurveIndex];
        const firstPoint = currentCurve.points[0];

        // Verificar se está tentando fechar o laço (distância < 25px do primeiro ponto)
        const distanceToStart = Math.sqrt(
          Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
        );

        if (currentCurve.points.length >= 3 && distanceToStart < 25) {
          // Fechar o laço automaticamente - não adiciona novo ponto
          const updatedCurves = [...bezierCurves];
          updatedCurves[existingCurveIndex].closed = true;
          // Mudar cor da curva de 'red' para algo diferente para indicar que não está mais sendo editada
          updatedCurves[existingCurveIndex].color = 'transparent'; // Mantém a forma mas não permite mais edição
          setBezierCurves(updatedCurves);

          return;
        }
      }
    }

    // Verificar se clicou em um círculo existente ou transformer (não interfere com fechamento)
    const isShape = e.target !== e.target.getStage() && (e.target.getClassName() === 'Circle' || e.target.getClassName() === 'Transformer');

    if (!isShape) {
      // Clicou na área vazia - executar ação baseada na ferramenta
      if (selectedTool === 'bezier') {
        // Lógica do Bézier preenchido
        const existingCurveIndex = bezierCurves.findIndex(curve => curve.color === 'red');

        if (existingCurveIndex >= 0) {
          // Adicionar ponto normalmente (não fechou, então adiciona)
          const updatedCurves = [...bezierCurves];
          updatedCurves[existingCurveIndex].points.push({ x: pos.x, y: pos.y });
          setBezierCurves(updatedCurves);
        } else {
          // Criar nova curva Bézier
          setBezierCurves(prev => [...prev, {
            points: [{ x: pos.x, y: pos.y }],
            color: 'red',
            closed: false
          }]);
        }
      }

      // Desmarcar círculo selecionado quando clicar na área vazia
      setSelectedShapeId(null);
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!originalImage) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    setMousePos({ x: pos.x, y: pos.y });

    // Atualizar preview do círculo durante drag
    if (isCreatingCircle && circlePreview) {
      const radius = Math.sqrt(
        Math.pow(pos.x - circleStartPos.x, 2) + Math.pow(pos.y - circleStartPos.y, 2)
      );
      setCirclePreview({
        ...circlePreview,
        radius: Math.max(radius / 2, 10) // Mínimo de 10px raio
      });
    }
  };

  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isCreatingCircle || !circlePreview) return;

    // Finalizar criação do círculo
    const newCircle: CircleShape = {
      ...circlePreview,
      id: `circle-${Date.now()}`
    };

    setCircleShapes(prev => [...prev, newCircle]);
    setIsCreatingCircle(false);
    setCirclePreview(null);
  };



  const handleNewCurve = () => {
    if (selectedTool === 'bezier') {
      // Desfazer último ponto do Bézier
      setBezierCurves(prev => {
        const newCurves = [...prev];
        const currentCurveIndex = newCurves.findIndex(curve => curve.color === 'red');

        if (currentCurveIndex >= 0 && newCurves[currentCurveIndex].points.length > 1) {
          newCurves[currentCurveIndex].points.pop();
        }

        return newCurves;
      });
    } else {
      // Para círculos, remova o último
      setCircleShapes(prev => prev.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    setBezierCurves([]);
    setCircleShapes([]);
    setSelectedShapeId(null);
  };

  const generateImage = async () => {
    if (!originalImage || !stageRef.current) return;

    if (bezierCurves.length === 0 && circleShapes.length === 0) {
      throw new Error('Nenhuma máscara foi criada ainda.');
    }

    console.log('🎨 Starting image generation process...');

    try {
      console.log('📤 Step 1: Uploading processed canvas version');

      // Primeiro: fazer upload da versão processada (canvas 1:1 branco) - que está como dataURL
      // Converter dataURL do processedCanvasUrl para blob
      const processedResponse = await fetch(imageUrl);
      const processedBlob = await processedResponse.blob();

      const processedFileName = `canvas-processed-${Date.now()}-${Math.random()}.png`;
      const processedFilePath = processedFileName;

      const { error: processedUploadError, data: processedUploadData } = await supabase.storage
        .from('plugin-images')
        .upload(processedFilePath, processedBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (processedUploadError) {
        console.error('Upload error for processed canvas:', processedUploadError);
        throw new Error(`Falha no upload do canvas processado: ${processedUploadError.message}`);
      }

      const { data: processedUrlData } = supabase.storage
        .from('plugin-images')
        .getPublicUrl(processedFilePath);

      const processedCanvasUrl = processedUrlData.publicUrl;

      console.log('✅ Processed canvas uploaded:', processedCanvasUrl.substring(0, 60) + '...');

      // Segundo: criar versão modificada usando um canvas HTML5 temporário (mais seguro)
      console.log('🎯 Step 2: Creating modified canvas with 780x780');

      // Criar canvas temporário 780x780
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 780;
      tempCanvas.height = 780;
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) {
        throw new Error('Não foi possível criar contexto de canvas');
      }

      // Aplicar fundo branco
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.fillRect(0, 0, 780, 780);

      console.log('🖼️ Step 3: Drawing base image on temp canvas');

      // Desenhar imagem base (já processada no stage original)
      const baseImageData = stageRef.current.toDataURL({
        mimeType: 'image/png',
        quality: 1.0,
        pixelRatio: 1,
        width: stageRef.current.width(),
        height: stageRef.current.height()
      });

      const baseImage = new Image();
      await new Promise((resolve, reject) => {
        baseImage.onload = resolve;
        baseImage.onerror = reject;
        baseImage.src = baseImageData;
      });

      // Centralizar e redimensionar imagem no canvas 780x780
      const imgAspect = baseImage.width / baseImage.height;
      let drawWidth = 780;
      let drawHeight = 780 / imgAspect;

      if (drawHeight > 780) {
        drawHeight = 780;
        drawWidth = 780 * imgAspect;
      }

      const drawX = (780 - drawWidth) / 2;
      const drawY = (780 - drawHeight) / 2;

      tempCtx.drawImage(baseImage, drawX, drawY, drawWidth, drawHeight);

      console.log('✅ Modified canvas created successfully at 780x780');

      // Converter canvas para blob
      const modifiedBlob = await new Promise<Blob>((resolve, reject) => {
        tempCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Falha ao converter canvas para blob'));
            }
          },
          'image/png',
          1.0
        );
      });

      console.log('📤 Step 4: Uploading modified canvas');

      // Upload da versão modificada
      const fileName = `mask-modified-${Date.now()}-${Math.random()}.png`;
      const filePath = fileName;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('plugin-images')
        .upload(filePath, modifiedBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error for modified canvas:', uploadError);
        throw new Error(`Falha no upload: ${uploadError.message}`);
      }

      const { data: modifiedUrlData } = supabase.storage
        .from('plugin-images')
        .getPublicUrl(filePath);

      const modifiedCanvasUrl = modifiedUrlData.publicUrl;

      console.log('✅ Both versions successfully saved:');
      console.log('- Canvas processed (1:1 white):', processedCanvasUrl.substring(0, 60) + '...');
      console.log('- Canvas modified (with drawings):', modifiedCanvasUrl.substring(0, 60) + '...');

      // Chamar callback com ambas as URLs
      await onGenerateCombination(processedCanvasUrl, modifiedCanvasUrl);

      // Fechar modal
      onOpenChange(false);
      onModalClose?.();

    } catch (error: any) {
      console.error('❌ Error during image generation:', error);
      throw error; // Re-throw para mostrar erro ao usuário
    }
  };

  const handleCancel = () => {
    setBezierCurves([]);
    setCircleShapes([]);
    setSelectedShapeId(null);
    setSelectedTool('bezier');
    onOpenChange(false);
    onModalClose?.();
  };

  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Deselect circle only when clicking on the stage itself, not on shapes
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedShapeId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden"
        style={{
          width: modalSize.width + 100, // + padding
          maxWidth: 'none'
        }}
      >
        <DialogHeader>
          <DialogTitle>Editor de Máscaras</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col">
          {/* Ferramentas */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/50">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <Button
                  size="sm"
                  variant={selectedTool === "bezier" ? "default" : "outline"}
                  className="w-10 h-10 p-0"
                  onClick={() => setSelectedTool("bezier")}
                >
                  <PaintBucket className="h-5 w-5" />
                </Button>
                <span className="text-xs text-muted-foreground">Textura</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <Button
                  size="sm"
                  variant={selectedTool === "circle" ? "default" : "outline"}
                  className="w-10 h-10 p-0 bg-yellow-300 hover:bg-yellow-400 border border-yellow-500"
                  onClick={() => setSelectedTool("circle")}
                >
                  <LucideCircle className="h-5 w-5 text-yellow-800" />
                </Button>
                <span className="text-xs text-muted-foreground">Logo</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleNewCurve}>
                {selectedTool === 'bezier' ? 'Desfazer ponto' : 'Remover último'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearAll}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Área de desenho */}
          <div className="p-4">
            <div
              className="border rounded-lg overflow-hidden bg-gray-100 mx-auto"
              style={{
                width: modalSize.width,
                height: modalSize.height
              }}
            >
              {originalImage && (
                <Stage
                  ref={stageRef}
                  width={modalSize.width}
                  height={modalSize.height}
                  style={{ cursor: selectedTool === 'bezier' ? 'crosshair' : 'pointer' }}
                  onMouseDown={(e) => {
                    // Círculos: mouse down na área vazia
                    if (selectedTool === 'circle') {
                      handleStageMouseDown(e);
                    }
                  }}
                  onMouseMove={handleStageMouseMove}
                  onMouseUp={handleStageMouseUp}
                  onClick={handleStageClick}
                >
                  <Layer>
                    {/* Imagem base */}
                    <KonvaImage
                      image={originalImage}
                      width={modalSize.width}
                      height={modalSize.height}
                      x={0}
                      y={0}
                    />

                    {/* Preview do círculo durante criação (drag) */}
                    {circlePreview && (
                      <Circle
                        x={circlePreview.x}
                        y={circlePreview.y}
                        radius={circlePreview.radius}
                        fill={'#FFFF0066'} // amarelo semi-transparente
                        stroke={'#FFFF00'}
                        strokeWidth={1}
                        dash={[5, 5]} // linha tracejada para preview
                      />
                    )}

                    {/* Círculos amarelos (móveis/redimensionáveis) */}
                    {circleShapes.map((circle, index) => (
                      <Circle
                        key={circle.id}
                        x={circle.x}
                        y={circle.y}
                        radius={circle.radius}
                        fill={'#FFFF00CC'}
                        stroke={'#FFFF00'}
                        strokeWidth={2}
                        draggable
                        onClick={() => setSelectedShapeId(circle.id)}
                        onDragEnd={(e) => {
                          const newCircles = [...circleShapes];
                          newCircles[index].x = e.target.x();
                          newCircles[index].y = e.target.y();
                          setCircleShapes(newCircles);
                        }}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          const newCircles = [...circleShapes];
                          newCircles[index].x = node.x();
                          newCircles[index].y = node.y();
                          newCircles[index].radius = node.width() / 2;
                          setCircleShapes(newCircles);
                          node.scaleX(1);
                          node.scaleY(1);
                        }}
                        ref={(node) => {
                          if (selectedShapeId === circle.id && transformerRef.current && node) {
                            transformerRef.current.nodes([node]);
                          }
                        }}
                      />
                    ))}

                    {/* Curvas Bézier */}
                    {bezierCurves.map((curve, curveIndex) => {
                      if (curve.points.length < 1) return null;

                      if (curve.closed && curve.points.length >= 3) {
                        // Renderizar forma preenchida fechada
                        const path = generateFilledPath(curve.points);
                        return (
                          <Group key={curveIndex}>
                            {/* Forma preenchida */}
                            <Path
                              data={path}
                              fill={'#FF0000CC'}
                              stroke={'#FF0000'}
                              strokeWidth={2}
                              onMouseEnter={() => {
                                setPointsVisible(true);
                              }}
                              onMouseLeave={() => {
                                setPointsVisible(false);
                              }}
                            />

                            {/* Pontos editáveis da forma fechada - visíveis no hover ou durante interação */}
                            {curve.points.map((point, pointIndex) => (
                              <Circle
                                key={`point-${pointIndex}`}
                                x={point.x}
                                y={point.y}
                                radius={6}
                                fill={'#FF0000'}
                                stroke={'#FFFFFF'}
                                strokeWidth={2}
                                opacity={pointsVisible ? 1 : 0}
                                draggable
                                onMouseEnter={(e) => {
                                  // Efeito hover: aumentar raio e mudar cursor
                                  e.target.scale({ x: 1.5, y: 1.5 });
                                  e.target.getStage()!.container().style.cursor = 'move';
                                }}
                                onMouseLeave={(e) => {
                                  // Voltar ao normal
                                  e.target.scale({ x: 1, y: 1 });
                                  e.target.getStage()!.container().style.cursor = 'default';
                                }}
                                onDragStart={(e) => {
                                  // Cursor de drag
                                  e.target.getStage()!.container().style.cursor = 'grabbing';
                                }}
                                onDragEnd={(e) => {
                                  // Atualizar posição do ponto na curva
                                  const newPos = { x: e.target.x(), y: e.target.y() };
                                  const updatedCurves = [...bezierCurves];
                                  updatedCurves[curveIndex].points[pointIndex] = newPos;
                                  setBezierCurves(updatedCurves);

                                  // Voltar cursor
                                  e.target.getStage()!.container().style.cursor = 'default';
                                }}
                              />
                            ))}
                          </Group>
                        );
                      } else {
                        // Renderizar linha aberta em construção
                        return (
                          <Group key={curveIndex}>
                            {/* Linha em construção */}
                            <Line
                              points={curve.points.flatMap(p => [p.x, p.y])}
                              stroke={'#FF0000'}
                              strokeWidth={4}
                              lineCap="round"
                              lineJoin="round"
                            />

                            {/* Pontos da linha */}
                            {curve.points.map((point, pointIndex) => (
                              <Circle
                                key={pointIndex}
                                x={point.x}
                                y={point.y}
                                radius={6}
                                fill={'#FF0000'}
                                stroke={'#FFFFFF'}
                                strokeWidth={2}
                              />
                            ))}

                            {/* Preview do próximo traço - linha tracejada do último ponto ao mouse */}
                            {curve.points.length >= 0 && (
                              <Line
                                points={[curve.points[curve.points.length - 1].x, curve.points[curve.points.length - 1].y, mousePos.x, mousePos.y]}
                                stroke={'#0000FF'}
                                strokeWidth={2}
                                dash={[5, 5]}
                                opacity={0.7}
                              />
                            )}

                            {/* Indicação visual quando próximo de fechar o laço */}
                            {curve.points.length >= 3 && isNearFirstPoint(curve, mousePos) && (
                              <Circle
                                x={curve.points[0].x}
                                y={curve.points[0].y}
                                radius={8}
                                stroke="#FFA500"
                                strokeWidth={2}
                                fill="transparent"
                              />
                            )}
                          </Group>
                        );
                      }
                    })}

                    {/* Transformer para manipular círculos selecionados */}
                    <Transformer
                      ref={transformerRef}
                      boundBoxFunc={(oldBox, newBox) => {
                        // Limitar mínimo tamanho do círculo
                        if (newBox.width < 10 || newBox.height < 10) {
                          return oldBox;
                        }
                        return newBox;
                      }}
                    />
                  </Layer>
                </Stage>
              )}
            </div>

            
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 p-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={generateImage} disabled={generating || (bezierCurves.length === 0 && circleShapes.length === 0)}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar Imagem"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
