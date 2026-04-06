import SwiftUI
import PhotosUI

struct EditProfileView: View {
    var viewModel: ProfileViewModel
    @Environment(\.dismiss) private var dismiss

    private let bioCharacterLimit = 300

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                avatarSection
                formSection
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                saveButton
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 40)
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") {
                    dismiss()
                }
                .foregroundStyle(.primary)
            }
        }
        .overlay {
            if viewModel.isSaving {
                ZStack {
                    Color.black.opacity(0.15)
                        .ignoresSafeArea()
                    ProgressView()
                        .scaleEffect(1.3)
                        .tint(.white)
                        .padding(20)
                        .background(Color(.systemGray2).opacity(0.9))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .onChange(of: viewModel.selectedPhotoItem) { _, newItem in
            guard let newItem else { return }
            Task {
                await viewModel.uploadAvatar(from: newItem)
            }
        }
    }

    // MARK: - Avatar Section

    private var avatarSection: some View {
        VStack(spacing: 12) {
            PhotosPicker(
                selection: $viewModel.selectedPhotoItem,
                matching: .images
            ) {
                ZStack(alignment: .bottomTrailing) {
                    // Current avatar
                    if let avatarURL = viewModel.avatarPublicURL() {
                        AsyncImage(url: avatarURL) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFill()
                            default:
                                avatarPlaceholder
                            }
                        }
                        .frame(width: 100, height: 100)
                        .clipShape(Circle())
                    } else {
                        avatarPlaceholder
                    }

                    // Camera badge
                    ZStack {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 30, height: 30)
                        Image(systemName: "camera.fill")
                            .font(.caption)
                            .foregroundStyle(.white)
                    }
                    .offset(x: 4, y: 4)
                }
            }
            .buttonStyle(.plain)

            Text("Tap to change photo")
                .font(.caption)
                .foregroundStyle(.secondary)
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

    // MARK: - Form Section

    private var formSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Display Name
            VStack(alignment: .leading, spacing: 6) {
                Text("Display Name")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                TextField("Your name", text: $viewModel.editDisplayName)
                    .font(.body)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .autocorrectionDisabled()
            }

            // Bio
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Bio")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("\(viewModel.editBio.count)/\(bioCharacterLimit)")
                        .font(.caption)
                        .foregroundStyle(viewModel.editBio.count > bioCharacterLimit ? .red : .tertiary)
                }
                TextEditor(text: $viewModel.editBio)
                    .font(.body)
                    .frame(minHeight: 100, maxHeight: 160)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .onChange(of: viewModel.editBio) { _, newValue in
                        if newValue.count > bioCharacterLimit {
                            viewModel.editBio = String(newValue.prefix(bioCharacterLimit))
                        }
                    }
            }
        }
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task {
                await viewModel.saveProfile()
                if viewModel.errorMessage == nil {
                    dismiss()
                }
            }
        } label: {
            if viewModel.isSaving {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
            } else {
                Text("Save")
                    .font(.body)
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
            }
        }
        .background(Color.blue)
        .foregroundStyle(.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .disabled(viewModel.isSaving)
    }
}
