import Supabase
import SwiftUI

struct CheckEmailView: View {
    let email: String

    @State private var isResending = false
    @State private var resendMessage: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "envelope.badge.fill")
                .font(.system(size: 64))
                .foregroundStyle(.accent)

            Text("Check your email")
                .font(.title.bold())

            Text("We sent a verification link to **\(email)**. Tap the link in the email to continue.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 32)

            if let message = resendMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Button {
                Task { await resend() }
            } label: {
                Text(isResending ? "Sending..." : "Resend email")
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color(.secondarySystemBackground))
                    .foregroundStyle(.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .padding(.horizontal, 32)
            }
            .disabled(isResending)

            Spacer()

            // No navigation options — user must verify via email before proceeding.
            // AppCoordinator transitions away when authStateChanges emits SIGNED_IN
            // with a non-nil session (from the PKCE deep link callback).
            Text("Once verified, the app will open automatically.")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .padding(.bottom, 32)
        }
    }

    private func resend() async {
        isResending = true
        defer { isResending = false }
        do {
            try await supabase.auth.resend(email: email, type: .signup)
            resendMessage = "Verification email resent."
        } catch {
            resendMessage = "Could not resend. Please try again."
        }
    }
}

#Preview {
    CheckEmailView(email: "user@example.com")
}
