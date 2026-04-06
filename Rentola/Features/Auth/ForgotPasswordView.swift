import SwiftUI

struct ForgotPasswordView: View {
    @State private var viewModel = AuthViewModel()
    @State private var resetSent = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Reset Password")
                        .font(.largeTitle.bold())

                    Text("Enter your email and we'll send you a reset link.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)

                if resetSent {
                    HStack(spacing: 12) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("Check your email for a reset link.")
                            .font(.subheadline)
                    }
                    .padding(14)
                    .background(Color.green.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                } else {
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

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task {
                            await viewModel.resetPassword()
                            if viewModel.errorMessage == nil {
                                resetSent = true
                            }
                        }
                    } label: {
                        Group {
                            if viewModel.isLoading {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .tint(Color(UIColor.systemBackground))
                            } else {
                                Text("Send Reset Link")
                                    .font(.body.bold())
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(viewModel.email.isEmpty || viewModel.isLoading
                            ? Color.primary.opacity(0.3)
                            : Color.primary)
                        .foregroundStyle(Color(UIColor.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(viewModel.email.isEmpty || viewModel.isLoading)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .navigationTitle("Reset Password")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        ForgotPasswordView()
    }
}
