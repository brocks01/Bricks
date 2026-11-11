import { INTERESTS, type Interest } from '@/api/types';
import {
  ChalkboardTeacherIcon,
  CookingPotIcon,
  LaptopIcon,
  MusicNotesIcon,
  PersonSimpleTaiChiIcon,
  PersonSimpleWalkIcon,
  PlantIcon,
  PuzzlePieceIcon,
  type Icon,
} from '@/components/primitives/icons';

export { INTERESTS };

/** One icon per interest (and skill tag), always shown next to its name. */
export const INTEREST_ICON: Record<Interest, Icon> = {
  walking: PersonSimpleWalkIcon,
  taichi: PersonSimpleTaiChiIcon,
  cooking: CookingPotIcon,
  chess: PuzzlePieceIcon,
  music: MusicNotesIcon,
  gardening: PlantIcon,
  teaching: ChalkboardTeacherIcon,
  technology: LaptopIcon,
};

export const isInterest = (tag: string): tag is Interest =>
  (INTERESTS as readonly string[]).includes(tag);

/** Interests named in what someone said ("walking and chess"), in the app's language. */
export function interestsIn(said: string, label: (interest: Interest) => string): Interest[] {
  const text = said.toLowerCase();
  return INTERESTS.filter((i) => text.includes(label(i).toLowerCase()));
}
