import SwiftUI

struct UpdatePasswordView: View {
    let coordinator: AppCoordinator

    @State private var viewModel = AuthViewModel()
    @State private var newPassword = ""
    @State private var confirmNewPassword = ""

    var isSubmitDisabled: Bool {
        newPassword.isEmpty
            || confirmNewPassword.isEmpty
            || newPassword != confirmNewPassword
            || viewModel.isLoading
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Update Password")
                        .font(.largeTitle.bold())

                    Text("Choose a new password for your account.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)

                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("New Password")
                            .font(.footnote.bold())
                            .foregroundStyle(.secondary)

                        SecureField("At least 8 characters", text: $newPassword)
                            .textContentType(.newPassword)
                            .padding(14)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Confirm New Password")
                            .font(.footnote.bold())
                            .foregroundStyle(.secondary)

                        SecureField("Re-enter your new password", text: $confirmNewPassword)
                            .textContentType(.newPassword)
                            .padding(14)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }

                Button {
                    Task { await viewModel.updatePassword(newPassword: newPassword) }
                } label: {
                    Group {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(Color(UIColor.systemBackground))
                        } else {
                            Text("Update Password")
                                .font(.body.bold())
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(isSubmitDisabled ? Color.primary.opacity(0.3) : Color.primary)
                    .foregroundStyle(Color(UIColor.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(isSubmitDisabled)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .navigationTitle("Update Password")
        .navigationBarTitleDisplayMode(.inline)
        // On success, AppCoordinator transitions to .main via authStateChanges TOKEN_REFRESHED.
    }
}

#Preview {
    NavigationStack {
        UpdatePasswordView(coordinator: AppCoordinator())
    }
}
