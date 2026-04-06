import SwiftUI

final class ListingCoordinator: ObservableObject {
    @Published var path = NavigationPath()

    enum Destination: Hashable {
        // Phase 2 adds: newListing, listingEdit(String), etc.
    }

    func push(_ destination: Destination) {
        path.append(destination)
    }

    func pop() {
        if !path.isEmpty { path.removeLast() }
    }

    func popToRoot() {
        path.removeLast(path.count)
    }
}
