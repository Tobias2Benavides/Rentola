import SwiftUI

struct SignInView: View {
    let coordinator: AppCoordinator

    @State private var viewModel = AuthViewModel()
    @State private var showForgotPassword = false

    var isSubmitDisabled: Bool {
        viewModel.email.isEmpty || viewModel.password.isEmpty || viewModel.isLoading
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Sign In")
                        .font(.largeTitle.bold())

                    Text("Welcome back")
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

                        SecureField("Your password", text: $viewModel.password)
                            .textContentType(.password)
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
                    Task { await viewModel.signIn() }
                } label: {
                    Group {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(Color(UIColor.systemBackground))
                        } else {
                            Text("Sign In")
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

                Button {
                    showForgotPassword = true
                } label: {
                    Text("Forgot Password?")
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .navigationTitle("Sign In")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showForgotPassword) {
            ForgotPasswordView()
        }
    }
}

#Preview {
    NavigationStack {
        SignInView(coordinator: AppCoordinator())
    }
}
