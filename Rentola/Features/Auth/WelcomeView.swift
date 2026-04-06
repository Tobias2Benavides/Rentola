import SwiftUI

struct WelcomeView: View {
    let coordinator: AppCoordinator

    @State private var showSignIn = false
    @State private var showSignUp = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Spacer()

                // Branding
                VStack(spacing: 12) {
                    Text("Rentola")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)

                    Text("Rent anything from people nearby")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 32)

                Spacer()

                // Action buttons
                VStack(spacing: 12) {
                    Button {
                        showSignUp = true
                    } label: {
                        Text("Create Account")
                            .font(.body.bold())
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.primary)
                            .foregroundStyle(Color(UIColor.systemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Button {
                        showSignIn = true
                    } label: {
                        Text("Sign In")
                            .font(.body.bold())
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color(UIColor.systemBackground))
                            .foregroundStyle(.primary)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .strokeBorder(.primary, lineWidth: 1.5)
                            )
                    }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 48)
            }
            .navigationDestination(isPresented: $showSignUp) {
                SignUpView(coordinator: coordinator)
            }
            .navigationDestination(isPresented: $showSignIn) {
                SignInView(coordinator: coordinator)
            }
        }
    }
}

#Preview {
    WelcomeView(coordinator: AppCoordinator())
}
