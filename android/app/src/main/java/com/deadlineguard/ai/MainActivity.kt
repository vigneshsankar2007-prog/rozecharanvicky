package com.deadlineguard.ai

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.deadlineguard.ai.ui.theme.DeadlineGuardTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DeadlineGuardTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()

                    NavHost(
                        navController = navController,
                        startDestination = "splash"
                    ) {
                        composable("splash") {
                            // Section 5: Splash Screen with authentication session verification
                        }
                        composable("login") {
                            // Section 7: Login Screen with JWT Token DataStore
                        }
                        composable("register") {
                            // Section 6: Register Screen
                        }
                        composable("dashboard") {
                            // Section 8: Dashboard with Top Priorities, AI Insight, Productivity
                        }
                        composable("tasks") {
                            // Section 10: Task Management & Intelligent Priority
                        }
                        composable("planner") {
                            // Section 16 & 17: AI Study Planner
                        }
                        composable("ai") {
                            // Section 18: DeadlineGuard AI Assistant
                        }
                        composable("focus") {
                            // Section 20: Pomodoro Focus Mode
                        }
                        composable("profile") {
                            // Section 24: Profile & Settings
                        }
                    }
                }
            }
        }
    }
}
