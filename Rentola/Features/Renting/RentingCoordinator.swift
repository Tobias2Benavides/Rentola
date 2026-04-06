import SwiftUI

@Observable
final class RentingCoordinator {
    var path = NavigationPath()

    enum Destination: Hashable {
        // Phase 4 adds: rentalDetail(String), etc.
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
