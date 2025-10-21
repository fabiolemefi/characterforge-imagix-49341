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
  onGenerateCombination: (maskDataUrl: string) => Promise<void>;
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

    // Verificar se clicou em um círculo existente ou transformer
    const isShape = e.target !== e.target.getStage() && (e.target.getClassName() === 'Circle' || e.target.getClassName() === 'Transformer');

    if (!isShape) {
      // Clicou na área vazia - executar ação baseada na ferramenta
      if (selectedTool === 'bezier') {
        // Lógica do Bézier preenchido
        const existingCurveIndex = bezierCurves.findIndex(curve => curve.color === 'red');

        if (existingCurveIndex >= 0) {
          const currentCurve = bezierCurves[existingCurveIndex];
          const firstPoint = currentCurve.points[0];

          // Verificar se está tentando fechar o laço (distância < 20px do primeiro ponto)
          const distanceToStart = Math.sqrt(
            Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
          );

          if (currentCurve.points.length >= 3 && distanceToStart < 20) {
            // Fechar o laço automaticamente - não adiciona novo ponto
            const updatedCurves = [...bezierCurves];
            updatedCurves[existingCurveIndex].closed = true;
            setBezierCurves(updatedCurves);
            return;
          }

          // Adicionar ponto normalmente
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

    // Salvar as dimensões originais do stage
    const originalWidth = stageRef.current.width();
    const originalHeight = stageRef.current.height();

    // Alterar fisicamente o tamanho do stage para 1024x1024
    // Isso garante que o canvas tenha 1024x1024 pixels reais
    stageRef.current.width(1024);
    stageRef.current.height(1024);

    // Reaplicar a escala para manter a proporção correta
    const scaleX = 1024 / originalWidth;
    const scaleY = 1024 / originalHeight;
    stageRef.current.scale({ x: scaleX, y: scaleY });

    console.log('🎨 Exporting mask - Stage resized to 1024x1024');

    // Exportar diretamente do stage (agora 1024x1024 reais)
    const maskDataUrl = stageRef.current.toDataURL({
      mimeType: 'image/png',
      quality: 1.0,
      pixelRatio: 1, // Sem pixel ratio extra para manter qualidade pura
      width: 1024,    // Garantir exportação em 1024x1024
      height: 1024
    });

    // Restaurar dimensões originais
    stageRef.current.width(originalWidth);
    stageRef.current.height(originalHeight);
    stageRef.current.scale({ x: 1, y: 1 });

    // Verificar se gerou data URL válida
    if (!maskDataUrl || maskDataUrl === 'data:,') {
      throw new Error('Falha ao gerar máscara do Stage');
    }

    console.log('✅ Máscara exportada diretamente do Stage em 1024x1024:', maskDataUrl.substring(0, 50) + '...');

    // Chamar callback para continuar com a geração (Efimagem.tsx fará o resto)
    await onGenerateCombination(maskDataUrl);

    // Fechar modal
    onOpenChange(false);
    onModalClose?.();
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
                <span className="text-xs text-muted-foreground">Bézier (vermelho)</span>
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
                <span className="text-xs text-muted-foreground">Círculos (amarelo)</span>
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
                      if (curve.points.length < 2) return null;

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
                            />
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
                                radius={3}
                                fill={'#FF0000'}
                              />
                            ))}

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

            <div className="text-center mt-4 text-sm text-muted-foreground">
              {selectedTool === 'bezier'
                ? "Clique para adicionar pontos. Quando tiver 3+ pontos, clique próximo ao primeiro (círculo laranja) para fechar o laço e preencher."
                : "Clique e arraste para criar círculos de diferentes tamanhos. Selecione um círculo existente para movê-lo ou redimensioná-lo."
              }
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
