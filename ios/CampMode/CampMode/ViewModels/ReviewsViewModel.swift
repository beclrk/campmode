import Foundation

@MainActor
class ReviewsViewModel: ObservableObject {
    @Published var reviews: [Review] = []
    @Published var isLoading = false
    
    private var locationId: String?
    
    func load(for locationId: String) async {
        self.locationId = locationId
        isLoading = true
        do {
            reviews = try await SupabaseClient.shared.fetchReviews(locationId: locationId)
        } catch {
            print("Failed to load reviews: \(error)")
        }
        isLoading = false
    }
    
    func submit(rating: Int, comment: String, userId: String) async -> Bool {
        guard let locationId = locationId else { return false }
        do {
            try await SupabaseClient.shared.submitReview(locationId: locationId, userId: userId, rating: rating, comment: comment)
            await load(for: locationId)
            return true
        } catch {
            print("Failed to submit review: \(error)")
            return false
        }
    }
    
    func delete(reviewId: String, userId: String) async -> Bool {
        guard let locationId = locationId else { return false }
        do {
            try await SupabaseClient.shared.deleteReview(reviewId: reviewId, userId: userId)
            await load(for: locationId)
            return true
        } catch {
            return false
        }
    }
}
