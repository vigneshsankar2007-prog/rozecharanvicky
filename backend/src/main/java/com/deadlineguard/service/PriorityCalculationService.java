package com.deadlineguard.service;

import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class PriorityCalculationService {

    public record PriorityResult(
        int priorityScore,
        String priorityLevel,
        int urgencyScore,
        int difficultyScore,
        int weightScore,
        int effortScore,
        int workloadScore,
        List<String> reasons
    ) {}

    /**
     * Section 12 Intelligent Priority System:
     * Priority Score = (Urgency * 0.40) + (Difficulty * 0.20) + (Academic Weight * 0.20) + (Effort * 0.10) + (Workload * 0.10)
     * Normalized 0–100.
     * Levels: 0–39 = Low, 40–59 = Medium, 60–79 = High, 80–100 = Critical.
     */
    public PriorityResult calculatePriority(
        Instant deadline,
        int difficultyRating,    // 1 - 5
        int academicWeight,      // 1 - 5
        double estimatedEffort,  // hours
        int activeDeadlinesCount // workload
    ) {
        Instant now = Instant.now();
        Duration diff = Duration.between(now, deadline);
        double diffHours = diff.toMinutes() / 60.0;

        // 1. Urgency (40%)
        double urgency;
        String urgencyReason;
        if (diffHours < 0) {
            urgency = 100.0;
            urgencyReason = "Task is OVERDUE! Immediate submission required to avoid grade penalties.";
        } else if (diffHours <= 12) {
            urgency = 98.0;
            urgencyReason = "Deadline is due within 12 hours. Critical urgency.";
        } else if (diffHours <= 24) {
            urgency = 88.0;
            urgencyReason = "Deadline is tomorrow. Highly pressing.";
        } else if (diffHours <= 48) {
            urgency = 72.0;
            urgencyReason = "Deadline is within 48 hours.";
        } else if (diffHours <= 72) {
            urgency = 55.0;
            urgencyReason = "Deadline in 3 days. Ample time if scheduled early.";
        } else if (diffHours <= 168) {
            urgency = 35.0;
            urgencyReason = "Due this week.";
        } else {
            urgency = 15.0;
            urgencyReason = "Due in more than a week.";
        }

        // 2. Difficulty (20%) - 1 to 5 scale normalized to 0-100
        int diffLevel = Math.clamp(difficultyRating, 1, 5);
        double difficultyScore = (diffLevel / 5.0) * 100.0;
        String difficultyReason = diffLevel >= 4 
            ? "Difficulty rating (" + diffLevel + "/5) is high, requiring focused concentration."
            : "Difficulty level is " + diffLevel + "/5.";

        // 3. Academic Weight (20%) - 1 to 5 credits normalized to 0-100
        int weight = Math.clamp(academicWeight, 1, 5);
        double weightScore = (weight / 5.0) * 100.0;
        String weightReason = weight >= 4
            ? "Academic weight (" + weight + " credits) has a significant impact on course GPA."
            : "Course credit weight is " + weight + "/5.";

        // 4. Estimated Effort (10%)
        double effortScore;
        if (estimatedEffort >= 8) effortScore = 100.0;
        else if (estimatedEffort >= 5) effortScore = 85.0;
        else if (estimatedEffort >= 3) effortScore = 65.0;
        else if (estimatedEffort >= 2) effortScore = 45.0;
        else effortScore = 25.0;
        String effortReason = "Estimated effort: " + estimatedEffort + " hours.";

        // 5. Workload (10%)
        double workloadScore;
        if (activeDeadlinesCount >= 4) workloadScore = 100.0;
        else if (activeDeadlinesCount >= 2) workloadScore = 70.0;
        else workloadScore = 40.0;
        String workloadReason = activeDeadlinesCount >= 3
            ? "High workload: " + activeDeadlinesCount + " active deadlines pending."
            : "Manageable workload situation.";

        double rawScore = (urgency * 0.40) +
                          (difficultyScore * 0.20) +
                          (weightScore * 0.20) +
                          (effortScore * 0.10) +
                          (workloadScore * 0.10);

        int score = (int) Math.round(Math.clamp(rawScore, 0.0, 100.0));

        String level;
        if (score >= 80) level = "Critical";
        else if (score >= 60) level = "High";
        else if (score >= 40) level = "Medium";
        else level = "Low";

        List<String> reasons = List.of(
            urgencyReason,
            difficultyReason,
            weightReason,
            effortReason,
            workloadReason
        );

        return new PriorityResult(
            score,
            level,
            (int) Math.round(urgency),
            (int) Math.round(difficultyScore),
            (int) Math.round(weightScore),
            (int) Math.round(effortScore),
            (int) Math.round(workloadScore),
            reasons
        );
    }
}
