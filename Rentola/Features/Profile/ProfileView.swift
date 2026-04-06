import SwiftUI

struct ProfileView: View {
    @State private var viewModel = ProfileViewModel()
    @State private var showEditProfile = false

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.profile == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 0) {
                        profileHeader
                        Divider()
                            .padding(.vertical, 24)
                        ratingSection
                        if viewModel.isProfileIncomplete {
                            completionPrompt
                                .padding(.top, 8)
                        }
                        Spacer(minLength: 40)
                        signOutButton
                            .padding(.bottom, 32)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 32)
                }
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink {
                    EditProfileView(viewModel: viewModel)
                } label: {
                    Text("Edit")
                        .fontWeight(.medium)
                }
            }
        }
        .task {
            await viewModel.loadProfile()
        }
        .alert("Error", isPresented: Binding(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button("OK") { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        VStack(spacing: 16) {
            // Avatar
            ZStack {
                if let avatarURL = viewModel.avatarPublicURL() {
                    AsyncImage(url: avatarURL) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        case .failure, .empty:
                            avatarPlaceholder
                        @unknown default:
                            avatarPlaceholder
                        }
                    }
                    .frame(width: 100, height: 100)
                    .clipShape(Circle())
                } else {
                    avatarPlaceholder
                }
            }

            // Display name
            VStack(spacing: 6) {
                if let name = viewModel.profile?.displayName, !name.isEmpty {
                    Text(name)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.primary)
                } else {
                    Text("Set up your profile")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                }

                // Bio
                if let bio = viewModel.profile?.bio, !bio.isEmpty {
                    Text(bio)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(4)
                } else {
                    Text("Add a bio to let others know about you")
                        .font(.body)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                }
            }
        }
    }

    // MARK: - Avatar Placeholder

    private var avatarPlaceholder: some View {
        ZStack {
            Circle()
                .fill(Color(.systemGray5))
                .frame(width: 100, height: 100)
            Image(systemName: "person.circle.fill")
                .resizable()
                .scaledToFit()
                .frame(width: 56, height: 56)
                .foregroundStyle(Color(.systemGray3))
        }
    }

    // MARK: - Rating Section

    private var ratingSection: some View {
        HStack(spacing: 6) {
            Image(systemName: "star.fill")
                .font(.body)
                .foregroundStyle(.yellow)
            if let rating = viewModel.profile?.averageRating, rating > 0 {
                Text(String(format: "%.1f", rating))
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
            } else {
                Text("No reviews yet")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Profile Completion Prompt (D-06)

    private var completionPrompt: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "person.badge.plus")
                    .font(.title3)
                    .foregroundStyle(.blue)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Complete your profile")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.primary)
                    Text("Build trust with other renters by adding your name, photo, and bio.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            NavigationLink {
                EditProfileView(viewModel: viewModel)
            } label: {
                Text("Edit Profile")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding(16)
        .background(Color(.systemBlue).opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Sign Out

    private var signOutButton: some View {
        Button(role: .destructive) {
            Task {
                await viewModel.signOut()
            }
        } label: {
            Text("Sign Out")
                .font(.body)
                .fontWeight(.medium)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundStyle(.red)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.red.opacity(0.3), lineWidth: 1)
                )
        }
    }
}

#Preview {
    NavigationStack {
        ProfileView()
    }
}
