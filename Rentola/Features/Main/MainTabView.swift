import SwiftUI

struct MainTabView: View {
    @State private var coordinator = MainTabCoordinator()

    var body: some View {
        TabView(selection: $coordinator.selectedTab) {
            NavigationStack(path: $coordinator.browse.path) {
                BrowsePlaceholderView()
                    .navigationDestination(for: BrowseCoordinator.Destination.self) { _ in
                        EmptyView()
                    }
            }
            .tabItem { Label(Tab.browse.label, systemImage: Tab.browse.systemImage) }
            .tag(Tab.browse)

            NavigationStack(path: $coordinator.renting.path) {
                RentingPlaceholderView()
                    .navigationDestination(for: RentingCoordinator.Destination.self) { _ in
                        EmptyView()
                    }
            }
            .tabItem { Label(Tab.renting.label, systemImage: Tab.renting.systemImage) }
            .tag(Tab.renting)

            NavigationStack(path: $coordinator.listing.path) {
                ListingPlaceholderView()
                    .navigationDestination(for: ListingCoordinator.Destination.self) { _ in
                        EmptyView()
                    }
            }
            .tabItem { Label(Tab.listing.label, systemImage: Tab.listing.systemImage) }
            .tag(Tab.listing)

            NavigationStack(path: $coordinator.profile.path) {
                ProfileView()
                    .navigationDestination(for: ProfileCoordinator.Destination.self) { _ in
                        EmptyView()
                    }
            }
            .tabItem { Label(Tab.profile.label, systemImage: Tab.profile.systemImage) }
            .tag(Tab.profile)
        }
    }
}

#Preview {
    MainTabView()
}
