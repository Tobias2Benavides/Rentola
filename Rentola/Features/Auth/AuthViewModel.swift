import Supabase

@Observable
final class AuthViewModel {
    var email = ""
    var password = ""
    var confirmPassword = ""
    var isLoading = false
    var errorMessage: String?

    func signUp(coordinator: AppCoordinator) async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please enter your email and password."
            return
        }
        guard password == confirmPassword else {
            errorMessage = "Passwords do not match."
            return
        }
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await supabase.auth.signUp(
                email: email,
                password: password,
                redirectTo: URL(string: "rentola://auth-callback")
            )
            // Email confirmation enabled -> session is nil -> show CheckEmail screen.
            coordinator.route = .checkEmail(email: email)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signIn() async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please enter your email and password."
            return
        }
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await supabase.auth.signIn(email: email, password: password)
            // authStateChanges emits SIGNED_IN -> AppCoordinator routes to .main
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func resetPassword() async {
        guard !email.isEmpty else {
            errorMessage = "Please enter your email address."
            return
        }
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await supabase.auth.resetPasswordForEmail(
                email,
                redirectTo: URL(string: "rentola://auth-callback")
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updatePassword(newPassword: String) async {
        guard !newPassword.isEmpty else {
            errorMessage = "Please enter a new password."
            return
        }
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await supabase.auth.update(user: UserAttributes(password: newPassword))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() async {
        do {
            try await supabase.auth.signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
