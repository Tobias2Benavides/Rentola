import XCTest

final class RentolaUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launch()
    }

    func testWelcomeScreenAppears() throws {
        // Phase 1: verify app launches without crashing.
        XCTAssertTrue(app.exists)
    }
}
