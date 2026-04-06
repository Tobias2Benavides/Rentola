import SwiftUI

struct BrowsePlaceholderView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("Browse")
                .font(.title2.bold())

            Text("Listings coming soon")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
        .navigationTitle("Browse")
    }
}

#Preview {
    NavigationStack {
        BrowsePlaceholderView()
    }
}
