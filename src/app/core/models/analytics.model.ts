export interface Analytics {
  userId: string;
  date: Date;
  notesCreated: number;
  notesEdited: number;
  studyTime: number; // in minutes
  tags: string[];
}

export interface StudyStats {
  totalNotes: number;
  totalStudyTime: number;
  activeStreak: number;
  mostUsedTags: string[];
}
