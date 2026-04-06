import SwiftUI

struct RentingPlaceholderView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "key.fill")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("Renting")
                .font(.title2.bold())

            Text("No active rentals yet")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
        .navigationTitle("Renting")
    }
}

#Preview {
    NavigationStack {
        RentingPlaceholderView()
    }
}
