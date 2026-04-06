import Supabase
import SwiftUI

enum AppRoute {
    case loading
    case welcome
    case checkEmail(email: String)
    case updatePassword
    case main
}

final class AppCoordinator: ObservableObject {
    @Published var route: AppRoute = .loading

    func startListening() async {
        for await (event, session) in supabase.auth.authStateChanges {
            switch event {
            case .initialSession:
                route = session != nil ? .main : .welcome
            case .signedIn:
                // SIGNED_IN fires on email verification callback AND on normal sign-in.
                // Check session to distinguish from "signed up but unconfirmed" state.
                route = session != nil ? .main : .welcome
            case .signedOut:
                route = .welcome
            case .passwordRecovery:
                route = .updatePassword
            default:
                break
            }
        }
    }
}
