import SwiftUI

struct SignUpView: View {
    let coordinator: AppCoordinator

    @StateObject private var viewModel = AuthViewModel()

    var isSubmitDisabled: Bool {
        viewModel.email.isEmpty
            || viewModel.password.isEmpty
            || viewModel.confirmPassword.isEmpty
            || viewModel.password != viewModel.confirmPassword
            || viewModel.isLoading
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Create Account")
                        .font(.largeTitle.bold())

                    Text("Sign up to start renting")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)

                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email")
                            .font(.footnote.bold())
                            .foregroundStyle(.secondary)

                        TextField("you@example.com", text: $viewModel.email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .padding(14)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.footnote.bold())
                            .foregroundStyle(.secondary)

                        SecureField("At least 8 characters", text: $viewModel.password)
                            .textContentType(.newPassword)
                            .padding(14)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Confirm Password")
                            .font(.footnote.bold())
                            .foregroundStyle(.secondary)

                        SecureField("Re-enter your password", text: $viewModel.confirmPassword)
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
                        .multilineTextAlignment(.leading)
                }

                Button {
                    Task { await viewModel.signUp(coordinator: coordinator) }
                } label: {
                    Group {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(Color(UIColor.systemBackground))
                        } else {
                            Text("Create Account")
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
        .navigationTitle("Create Account")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        SignUpView(coordinator: AppCoordinator())
    }
}
