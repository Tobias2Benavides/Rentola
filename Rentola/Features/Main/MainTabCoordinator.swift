import SwiftUI

enum Tab: Int, CaseIterable {
    case browse = 0
    case renting = 1
    case listing = 2
    case profile = 3

    var label: String {
        switch self {
        case .browse:  return "Browse"
        case .renting: return "Renting"
        case .listing: return "Listing"
        case .profile: return "Profile"
        }
    }

    var systemImage: String {
        switch self {
        case .browse:  return "magnifyingglass"
        case .renting: return "key.fill"
        case .listing: return "tag.fill"
        case .profile: return "person.circle.fill"
        }
    }
}

final class MainTabCoordinator: ObservableObject {
    @Published var selectedTab: Tab = .browse

    // NavigationPath per tab — @Published so TabView binding updates reliably on iOS 16
    @Published var browsePath  = NavigationPath()
    @Published var rentingPath = NavigationPath()
    @Published var listingPath = NavigationPath()
    @Published var profilePath = NavigationPath()

    // Sub-coordinators for Phase 2+ navigation methods and Destination enums
    let browse  = BrowseCoordinator()
    let renting = RentingCoordinator()
    let listing = ListingCoordinator()
    let profile = ProfileCoordinator()

    func switchToTab(_ tab: Tab) {
        selectedTab = tab
    }
}
