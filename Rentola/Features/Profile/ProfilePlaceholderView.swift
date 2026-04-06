import SwiftUI

struct ProfilePlaceholderView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("Profile")
                .font(.title2.bold())

            Text("Set up your profile")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
        .navigationTitle("Profile")
    }
}

#Preview {
    NavigationStack {
        ProfilePlaceholderView()
    }
}
