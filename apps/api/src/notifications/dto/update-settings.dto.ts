import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  remindersEnabled?: boolean;

  // Bounded so a reminder cannot be scheduled so far out that it never fires,
  // nor so often that it becomes noise.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  reminderAfterDays?: number;
}
