import Foundation

struct UserProfile: Codable, Identifiable {
    let id: UUID
    var displayName: String?
    var bio: String?
    var avatarURL: String?
    var averageRating: Double
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case bio
        case avatarURL = "avatar_url"
        case averageRating = "average_rating"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
