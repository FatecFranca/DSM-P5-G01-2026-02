import type { ComponentType } from "react";
import { RENDERER_OF, type ExerciseType, type Renderer } from "../../domain/exercise-types";
import { ChoiceExercise, type ExerciseRendererProps } from "./ChoiceExercise";
import { OrderExercise } from "./OrderExercise";
import { WordChoicesExercise } from "./WordChoicesExercise";

// Cada renderer do contrato tem exatamente um componente; um tipo novo sem renderer não compila.
const RENDERERS: Record<Renderer, ComponentType<ExerciseRendererProps>> = { choice: ChoiceExercise, word_choices: WordChoicesExercise, order: OrderExercise };

export const rendererFor = (type: ExerciseType): ComponentType<ExerciseRendererProps> => RENDERERS[RENDERER_OF[type]];
