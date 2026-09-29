package com.deadlineguard.ai.data.api

import com.deadlineguard.ai.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface DeadlineGuardApi {

    @POST("api/auth/register")
    suspend fun register(@Body body: Map<String, String>): Response<Map<String, Any>>

    @POST("api/auth/login")
    suspend fun login(@Body body: Map<String, String>): Response<Map<String, Any>>

    @GET("api/users/me")
    suspend fun getMe(): Response<User>

    @GET("api/dashboard")
    suspend fun getDashboard(): Response<DashboardResponse>

    @GET("api/tasks")
    suspend fun getTasks(
        @Query("status") status: String? = null,
        @Query("priority") priority: String? = null,
        @Query("search") search: String? = null,
        @Query("sort") sort: String? = null
    ): Response<List<Task>>

    @GET("api/tasks/{id}")
    suspend fun getTaskById(@Path("id") id: String): Response<Task>

    @POST("api/tasks")
    suspend fun createTask(@Body task: Map<String, Any>): Response<Task>

    @PUT("api/tasks/{id}")
    suspend fun updateTask(@Path("id") id: String, @Body task: Map<String, Any>): Response<Task>

    @DELETE("api/tasks/{id}")
    suspend fun deleteTask(@Path("id") id: String): Response<Map<String, String>>

    @PATCH("api/tasks/{id}/complete")
    suspend fun completeTask(@Path("id") id: String): Response<Task>

    @GET("api/subjects")
    suspend fun getSubjects(): Response<List<Subject>>

    @POST("api/subjects")
    suspend fun createSubject(@Body subject: Map<String, Any>): Response<Subject>

    @DELETE("api/subjects/{id}")
    suspend fun deleteSubject(@Path("id") id: String): Response<Map<String, String>>

    @POST("api/ai/chat")
    suspend fun chatWithAI(@Body body: Map<String, String>): Response<Map<String, String>>

    @POST("api/ai/study-plan")
    suspend fun generateStudyPlan(@Body body: Map<String, Any>): Response<Map<String, Any>>

    @GET("api/ai/recommendations")
    suspend fun getRecommendations(): Response<List<AIRecommendation>>

    @POST("api/study-sessions")
    suspend fun logStudySession(@Body session: Map<String, Any>): Response<StudySession>

    @GET("api/notifications")
    suspend fun getNotifications(): Response<List<NotificationItem>>

    @PATCH("api/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Response<NotificationItem>
}
