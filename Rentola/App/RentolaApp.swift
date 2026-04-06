import SwiftUI

@main
struct RentolaApp: App {
    @State private var coordinator = AppCoordinator()

    var body: some Scene {
        WindowGroup {
            Group {
                switch coordinator.route {
                case .loading:
                    // Neutral background — matches launch screen color.
                    // Shows for ~150ms while authStateChanges emits .initialSession.
                    Color(.systemBackground)
                        .ignoresSafeArea()
                case .welcome:
                    WelcomeView(coordinator: coordinator)
                case .checkEmail(let email):
                    CheckEmailView(email: email)
                case .updatePassword:
                    UpdatePasswordView(coordinator: coordinator)
                case .main:
                    MainTabView()
                }
            }
            .onOpenURL { url in
                // Handles email verification and password reset deep links (PKCE exchange).
                // Must be on root so it fires regardless of current screen.
                Task {
                    try? await supabase.auth.session(from: url)
                    // authStateChanges will emit SIGNED_IN — AppCoordinator handles the transition.
                }
            }
            .task {
                await coordinator.startListening()
            }
        }
    }
}
