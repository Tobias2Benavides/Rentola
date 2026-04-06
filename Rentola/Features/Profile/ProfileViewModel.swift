import Supabase
import PhotosUI
import SwiftUI
import UIKit

@Observable
final class ProfileViewModel {
    var profile: UserProfile?
    var isLoading = false
    var isSaving = false
    var errorMessage: String?
    var selectedPhotoItem: PhotosPickerItem?

    // Editable fields (populated from profile on load)
    var editDisplayName: String = ""
    var editBio: String = ""

    var isProfileIncomplete: Bool {
        guard let profile else { return true }
        return profile.displayName == nil || profile.displayName?.isEmpty == true
            || profile.avatarURL == nil || profile.avatarURL?.isEmpty == true
    }

    func loadProfile() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            let userId = try await supabase.auth.session.user.id
            let fetchedProfile: UserProfile = try await supabase
                .from("profiles")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            self.profile = fetchedProfile
            self.editDisplayName = fetchedProfile.displayName ?? ""
            self.editBio = fetchedProfile.bio ?? ""
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func saveProfile() async {
        isSaving = true
        defer { isSaving = false }
        errorMessage = nil
        do {
            let userId = try await supabase.auth.session.user.id
            struct ProfileUpdate: Encodable {
                let displayName: String
                let bio: String
                enum CodingKeys: String, CodingKey {
                    case displayName = "display_name"
                    case bio
                }
            }
            try await supabase
                .from("profiles")
                .update(ProfileUpdate(
                    displayName: editDisplayName,
                    bio: editBio
                ))
                .eq("id", value: userId)
                .execute()
            // Refresh the profile after saving
            await loadProfile()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func uploadAvatar(from item: PhotosPickerItem) async {
        isSaving = true
        defer { isSaving = false }
        errorMessage = nil
        do {
            guard let imageData = try await item.loadTransferable(type: Data.self) else {
                errorMessage = "Could not load the selected photo."
                return
            }
            guard let compressed = compressForUpload(imageData, maxDimension: 1080) else {
                errorMessage = "Could not process the selected photo."
                return
            }
            let userId = try await supabase.auth.session.user.id.uuidString
            let path = "\(userId)/avatar.jpeg"

            // Upload with upsert to replace existing avatar
            try await supabase.storage
                .from("avatars")
                .upload(
                    path: path,
                    file: compressed,
                    options: FileOptions(contentType: "image/jpeg", upsert: true)
                )

            // Update profile with the storage path
            try await supabase
                .from("profiles")
                .update(["avatar_url": path])
                .eq("id", value: userId)
                .execute()

            // Refresh profile
            await loadProfile()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func avatarPublicURL() -> URL? {
        guard let avatarPath = profile?.avatarURL, !avatarPath.isEmpty else { return nil }
        return try? supabase.storage
            .from("avatars")
            .getPublicURL(path: avatarPath)
    }

    // Compress image to maxDimension on longest side, JPEG quality 0.8
    // Per PITFALLS.md: never upload raw PHPicker output (192MB decoded on iPhone 15 Pro)
    private func compressForUpload(_ data: Data, maxDimension: CGFloat = 1080) -> Data? {
        guard let uiImage = UIImage(data: data) else { return nil }
        let size = uiImage.size
        let scale = min(maxDimension / size.width, maxDimension / size.height, 1.0)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in uiImage.draw(in: CGRect(origin: .zero, size: newSize)) }
        return resized.jpegData(compressionQuality: 0.8)
    }

    func signOut() async {
        do {
            try await supabase.auth.signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
