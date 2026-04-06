import SwiftUI

@Observable
final class ProfileCoordinator {
    var path = NavigationPath()

    enum Destination: Hashable {
        // Phase 2 adds: editProfile, etc.
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
