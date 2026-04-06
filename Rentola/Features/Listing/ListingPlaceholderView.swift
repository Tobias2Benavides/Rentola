import SwiftUI

struct ListingPlaceholderView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "tag.fill")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("Listing")
                .font(.title2.bold())

            Text("No listings yet")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
        .navigationTitle("Listing")
    }
}

#Preview {
    NavigationStack {
        ListingPlaceholderView()
    }
}
