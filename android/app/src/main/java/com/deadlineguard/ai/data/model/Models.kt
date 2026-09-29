package com.deadlineguard.ai.data.model

import com.google.gson.annotations.SerializedName

data class User(
    val id: String,
    val name: String,
    val email: String,
    val reminderOffsetHours: Int = 24,
    val createdAt: String
)

data class Subject(
    val id: String,
    val userId: String,
    val name: String,
    val code: String,
    val facultyName: String,
    val academicWeight: Int, // 1 - 5
    val color: String,
    val icon: String? = null
)

data class TaskPriority(
    val id: String,
    val taskId: String,
    val priorityScore: Int, // 0 - 100
    val priorityLevel: String, // Critical, High, Medium, Low
    val urgencyScore: Int,
    val difficultyScore: Int,
    val weightScore: Int,
    val effortScore: Int,
    val workloadScore: Int,
    val reasons: List<String>
)

data class Task(
    val id: String,
    val userId: String,
    val subjectId: String,
    val title: String,
    val description: String?,
    val taskType: String, // Assignment, Exam, Project, Lab, Quiz, Presentation
    val deadline: String,
    val estimatedEffortHours: Double,
    val difficulty: Int, // 1 - 5
    val academicWeight: Int, // 1 - 5
    val status: String, // Pending, In Progress, Completed
    val notes: String?,
    val priority: TaskPriority? = null
)

data class DashboardOverview(
    val tasksDueToday: Int,
    val tasksOverdue: Int,
    val tasksHighPriority: Int,
    val tasksCompleted: Int,
    val tasksPending: Int,
    val totalTasks: Int
)

data class ProductivityMetrics(
    val completionPercentage: Int,
    val studyHours: Double,
    val tasksCompletedCount: Int,
    val currentStreakDays: Int
)

data class DashboardResponse(
    val user: User,
    val overview: DashboardOverview,
    val productivity: ProductivityMetrics,
    val topPriorities: List<Task>,
    val subjects: List<Subject>,
    val aiInsight: String
)

data class StudySession(
    val id: String,
    val userId: String,
    val taskId: String?,
    val durationMinutes: Int,
    val plannedMinutes: Int,
    val completed: Boolean,
    val notes: String? = null,
    val createdAt: String
)

data class NotificationItem(
    val id: String,
    val userId: String,
    val taskId: String?,
    val title: String,
    val message: String,
    val type: String,
    val read: Boolean,
    val scheduledFor: String,
    val createdAt: String
)

data class AIRecommendation(
    val id: String,
    val userId: String,
    val taskId: String?,
    val title: String,
    val recommendation: String,
    val rationale: String,
    val priorityLevel: String,
    val urgencySummary: String
)
