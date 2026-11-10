import type { EventCategory } from '@/api/types';
import {
  BookOpenIcon,
  CalendarBlankIcon,
  ChalkboardTeacherIcon,
  CookingPotIcon,
  MusicNotesIcon,
  PersonSimpleTaiChiIcon,
  PersonSimpleWalkIcon,
  PlantIcon,
  PuzzlePieceIcon,
  UsersThreeIcon,
  type Icon,
} from '@/components/primitives/icons';

/** Shown in place of a photo when an event or circle has none. Never clip-art. */
export const CATEGORY_ICON: Record<EventCategory, Icon> = {
  walk: PersonSimpleWalkIcon,
  exercise: PersonSimpleTaiChiIcon,
  class: ChalkboardTeacherIcon,
  games: PuzzlePieceIcon,
  music: MusicNotesIcon,
  cooking: CookingPotIcon,
  gardening: PlantIcon,
  kids: BookOpenIcon,
  meetup: UsersThreeIcon,
  other: CalendarBlankIcon,
};
