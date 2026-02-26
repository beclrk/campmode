import SwiftUI
import CoreLocation

struct LocationDetailSheet: View {
    let location: CampLocation
    @ObservedObject var reviewsVM: ReviewsViewModel
    let userLocation: CLLocation?
    let isInRoute: Bool
    let isSaved: Bool
    let onAddToRoute: () -> Void
    let onRemoveFromRoute: () -> Void
    let onSave: () -> Void
    let onUnsave: () -> Void
    let onAddToTrip: () -> Void
    let onNavigate: () -> Void
    var userId: String?
    
    @State private var showReviewForm = false
    @State private var reviewRating = 5
    @State private var reviewComment = ""
    @State private var showAllFacilities = false
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    headerSection
                    photoCarousel
                    quickInfoChips
                    addressSection
                    bookButton
                    actionButtons
                    contactSection
                    facilitiesSection
                    saveRouteButtons
                    navigationButton
                    reviewsSection
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
            }
            .background(Color(red: 0.07, green: 0.07, blue: 0.07))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.caption.bold())
                            .foregroundColor(.gray)
                            .frame(width: 30, height: 30)
                            .background(Color(white: 0.15))
                            .clipShape(Circle())
                    }
                }
            }
        }
        .task { await reviewsVM.load(for: location.id) }
    }
    
    // MARK: - Header
    private var headerSection: some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(location.type.color.opacity(0.15))
                    .frame(width: 56, height: 56)
                Image(systemName: location.type.systemImage)
                    .font(.system(size: 24))
                    .foregroundColor(location.type.color)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(location.type.singularLabel)
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(location.type.color.opacity(0.2))
                        .foregroundColor(location.type.color)
                        .cornerRadius(8)
                    
                    if let rating = location.rating {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill").font(.caption).foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating)).font(.subheadline.weight(.medium)).foregroundColor(.white)
                            if let count = location.reviewCount, count > 0 {
                                Text("(\(count))").font(.caption).foregroundColor(.gray)
                            }
                        }
                    }
                }
                
                Text(location.name)
                    .font(.title3.bold())
                    .foregroundColor(.white)
                    .lineLimit(2)
                
                HStack(spacing: 12) {
                    if let dist = location.formattedDistance(from: userLocation) {
                        Text("Distance: \(dist) away")
                            .font(.caption).foregroundColor(.gray)
                    }
                    if !location.priceLabelText.isEmpty {
                        Text(location.priceLabelText + (location.type == .campsite ? " per night" : ""))
                            .font(.caption.weight(.medium)).foregroundColor(.green)
                    }
                }
            }
        }
        .padding(.top, 8)
    }
    
    // MARK: - Photos
    @ViewBuilder
    private var photoCarousel: some View {
        if !location.images.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(location.images.enumerated()), id: \.offset) { _, url in
                        AsyncImage(url: URL(string: url)) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fill)
                            default:
                                Color(white: 0.15)
                            }
                        }
                        .frame(width: 240, height: 150)
                        .cornerRadius(12)
                        .clipped()
                    }
                }
            }
        }
    }
    
    // MARK: - Quick Info
    @ViewBuilder
    private var quickInfoChips: some View {
        let chips = location.filteredFacilities.prefix(4)
        if !location.priceLabelText.isEmpty || !chips.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    if !location.priceLabelText.isEmpty {
                        chipView("💷 \(location.priceLabelText == "Free" ? "Free" : location.priceLabelText)")
                    }
                    ForEach(Array(chips.enumerated()), id: \.offset) { _, f in
                        chipView(f)
                    }
                    if location.filteredFacilities.count > 4 {
                        chipView("+\(location.filteredFacilities.count - 4)", muted: true)
                    }
                }
            }
        }
    }
    
    private func chipView(_ text: String, muted: Bool = false) -> some View {
        Text(text)
            .font(.caption)
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(Color(white: 0.15))
            .foregroundColor(muted ? .gray : Color(white: 0.8))
            .cornerRadius(8)
    }
    
    // MARK: - Address
    private var addressSection: some View {
        Button {
            let q = location.address.isEmpty ? "\(location.lat),\(location.lng)" : location.address
            if let url = URL(string: "https://maps.apple.com/?q=\(q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
                UIApplication.shared.open(url)
            }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "mappin").foregroundColor(.gray)
                Text(location.address.isEmpty ? "Location not listed" : location.address)
                    .font(.subheadline).foregroundColor(Color(white: 0.8))
                    .lineLimit(2).multilineTextAlignment(.leading)
                Spacer()
                Image(systemName: "arrow.up.right").font(.caption).foregroundColor(.gray)
            }
            .padding(12)
            .background(Color(white: 0.1))
            .cornerRadius(12)
        }
    }
    
    // MARK: - Book
    @ViewBuilder
    private var bookButton: some View {
        if (location.type == .campsite || location.type == .restStop), let website = location.website, !website.isEmpty {
            Link(destination: URL(string: website.hasPrefix("http") ? website : "https://\(website)")!) {
                HStack {
                    Image(systemName: "calendar.badge.checkmark")
                    Text(location.type == .campsite ? "Book or check availability" : "Check availability")
                        .font(.subheadline.weight(.medium))
                }
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(Color.green.opacity(0.8))
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Actions
    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button {
                let q = [location.name, location.address].filter { !$0.isEmpty }.joined(separator: " ")
                if let url = URL(string: "https://www.google.com/search?q=\(q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
                    UIApplication.shared.open(url)
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.up.right").font(.caption)
                    Text("Open in Google").font(.caption.weight(.medium))
                }
                .frame(maxWidth: .infinity, minHeight: 42)
                .background(Color(white: 0.15))
                .foregroundColor(Color(white: 0.8))
                .cornerRadius(12)
            }
            
            if let phone = location.phone, !phone.isEmpty {
                Link(destination: URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))")!) {
                    HStack(spacing: 6) {
                        Image(systemName: "phone").font(.caption)
                        Text("Call").font(.caption.weight(.medium))
                    }
                    .frame(maxWidth: .infinity, minHeight: 42)
                    .background(Color(white: 0.15))
                    .foregroundColor(Color(white: 0.8))
                    .cornerRadius(12)
                }
            }
        }
    }
    
    // MARK: - Share
    private var shareButton: some View {
        ShareLink(item: "https://campmode.app/place/\(location.id)") {
            HStack {
                Image(systemName: "square.and.arrow.up")
                Text("Share place").font(.subheadline.weight(.medium))
            }
            .frame(maxWidth: .infinity, minHeight: 42)
            .background(Color(white: 0.15))
            .foregroundColor(Color(white: 0.8))
            .cornerRadius(12)
        }
    }
    
    // MARK: - Contact
    @ViewBuilder
    private var contactSection: some View {
        if location.phone != nil || location.website != nil {
            VStack(alignment: .leading, spacing: 8) {
                Text("Contact").font(.headline).foregroundColor(.white)
                
                if let phone = location.phone, !phone.isEmpty {
                    Link(destination: URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))")!) {
                        HStack(spacing: 12) {
                            Image(systemName: "phone.fill").foregroundColor(.green)
                            Text(phone).font(.subheadline).foregroundColor(Color(white: 0.8))
                            Spacer()
                        }
                        .padding(12).background(Color(white: 0.1)).cornerRadius(12)
                    }
                }
                
                if let website = location.website, !website.isEmpty {
                    Link(destination: URL(string: website.hasPrefix("http") ? website : "https://\(website)")!) {
                        HStack(spacing: 12) {
                            Image(systemName: "globe").foregroundColor(.blue)
                            Text(website.replacingOccurrences(of: "https://", with: "").replacingOccurrences(of: "http://", with: ""))
                                .font(.subheadline).foregroundColor(Color(white: 0.8)).lineLimit(1)
                            Spacer()
                            Image(systemName: "arrow.up.right").font(.caption).foregroundColor(.gray)
                        }
                        .padding(12).background(Color(white: 0.1)).cornerRadius(12)
                    }
                }
            }
        }
    }
    
    // MARK: - Facilities
    private var facilitiesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Facilities").font(.headline).foregroundColor(.white)
            
            let visible = showAllFacilities ? location.filteredFacilities : Array(location.filteredFacilities.prefix(6))
            
            FlowLayout(spacing: 6) {
                ForEach(Array(visible.enumerated()), id: \.offset) { _, facility in
                    Text(facility)
                        .font(.caption)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Color(white: 0.15))
                        .foregroundColor(Color(white: 0.8))
                        .cornerRadius(16)
                }
                
                if location.filteredFacilities.count > 6 && !showAllFacilities {
                    Button { showAllFacilities = true } label: {
                        Text("+\(location.filteredFacilities.count - 6) more")
                            .font(.caption)
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(Color(white: 0.15))
                            .foregroundColor(.green)
                            .cornerRadius(16)
                    }
                }
            }
        }
    }
    
    // MARK: - Save / Route / Trip
    private var saveRouteButtons: some View {
        VStack(spacing: 10) {
            // Save
            Button(action: isSaved ? onUnsave : onSave) {
                HStack {
                    Image(systemName: isSaved ? "heart.fill" : "heart")
                    Text(isSaved ? "Saved — tap to remove" : "Save place")
                        .font(.subheadline.weight(.medium))
                }
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(isSaved ? Color.red.opacity(0.1) : .clear)
                .foregroundColor(isSaved ? .red : .gray)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSaved ? Color.red.opacity(0.5) : Color(white: 0.25), style: StrokeStyle(lineWidth: 1, dash: isSaved ? [] : [6]))
                )
                .cornerRadius(12)
            }
            
            // Route
            Button(action: isInRoute ? onRemoveFromRoute : onAddToRoute) {
                HStack {
                    Image(systemName: "point.topleft.down.to.point.bottomright.curvepath")
                    Text(isInRoute ? "Remove from route" : "Add to route")
                        .font(.subheadline.weight(.medium))
                }
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(isInRoute ? Color.green.opacity(0.1) : .clear)
                .foregroundColor(isInRoute ? .green : .gray)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isInRoute ? Color.green.opacity(0.5) : Color(white: 0.25), style: StrokeStyle(lineWidth: 1, dash: isInRoute ? [] : [6]))
                )
                .cornerRadius(12)
            }
            
            // Trip
            Button(action: onAddToTrip) {
                HStack {
                    Image(systemName: "folder.badge.plus")
                    Text("Add to trip").font(.subheadline.weight(.medium))
                }
                .frame(maxWidth: .infinity, minHeight: 48)
                .foregroundColor(.gray)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(white: 0.25), style: StrokeStyle(lineWidth: 1, dash: [6]))
                )
                .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Navigate
    private var navigationButton: some View {
        Button(action: onNavigate) {
            HStack {
                Image(systemName: "location.fill")
                Text("Navigate").font(.subheadline.weight(.semibold))
            }
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(Color.white)
            .foregroundColor(.black)
            .cornerRadius(12)
        }
    }
    
    // MARK: - Reviews
    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Divider().background(Color(white: 0.15))
            
            HStack(spacing: 6) {
                Image(systemName: "bubble.left").foregroundColor(.white)
                Text("Reviews (\(reviewsVM.isLoading ? "…" : "\(reviewsVM.reviews.count)"))")
                    .font(.headline).foregroundColor(.white)
            }
            
            // Google Reviews link
            if let placeId = location.googlePlaceId {
                Link(destination: URL(string: "https://www.google.com/maps/place/?q=place_id:\(placeId)")!) {
                    HStack(spacing: 8) {
                        Text("🔍")
                        Text("View Google Reviews").font(.subheadline)
                        Image(systemName: "arrow.up.right").font(.caption)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Color(white: 0.15))
                    .foregroundColor(Color(white: 0.8))
                    .cornerRadius(12)
                }
            }
            
            // Add review
            if let userId = userId {
                if showReviewForm {
                    reviewFormView(userId: userId)
                } else {
                    Button { showReviewForm = true } label: {
                        HStack {
                            Image(systemName: "camera")
                            Text("Add your review").font(.subheadline.weight(.medium))
                        }
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .foregroundColor(.green)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color(white: 0.2), style: StrokeStyle(lineWidth: 1, dash: [6]))
                        )
                        .cornerRadius(12)
                    }
                }
            }
            
            // Reviews list
            if reviewsVM.isLoading {
                Text("Loading reviews…").font(.caption).foregroundColor(.gray).frame(maxWidth: .infinity).padding()
            } else if reviewsVM.reviews.isEmpty {
                Text("No reviews yet. Be the first to share your experience!")
                    .font(.caption).foregroundColor(.gray).frame(maxWidth: .infinity).padding(.vertical, 24)
            } else {
                ForEach(reviewsVM.reviews) { review in
                    reviewRow(review)
                }
            }
        }
    }
    
    private func reviewFormView(userId: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your rating").font(.subheadline.weight(.medium)).foregroundColor(.white)
            HStack(spacing: 4) {
                ForEach(1...5, id: \.self) { n in
                    Button { reviewRating = n } label: {
                        Image(systemName: n <= reviewRating ? "star.fill" : "star")
                            .font(.title2)
                            .foregroundColor(n <= reviewRating ? .yellow : Color(white: 0.25))
                    }
                }
            }
            
            TextField("Share your experience…", text: $reviewComment, axis: .vertical)
                .lineLimit(3...6)
                .padding(12)
                .background(Color(white: 0.08))
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(white: 0.2)))
                .foregroundColor(.white)
            
            HStack(spacing: 8) {
                Button {
                    Task {
                        _ = await reviewsVM.submit(rating: reviewRating, comment: reviewComment, userId: userId)
                        showReviewForm = false
                        reviewComment = ""
                        reviewRating = 5
                    }
                } label: {
                    HStack {
                        Image(systemName: "paperplane")
                        Text("Submit review")
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Color.green)
                    .foregroundColor(.white)
                    .font(.subheadline.weight(.medium))
                    .cornerRadius(12)
                }
                
                Button { showReviewForm = false } label: {
                    Text("Cancel")
                        .frame(minHeight: 44)
                        .padding(.horizontal, 16)
                        .background(Color(white: 0.2))
                        .foregroundColor(.gray)
                        .font(.subheadline)
                        .cornerRadius(12)
                }
            }
        }
        .padding(16)
        .background(Color(white: 0.08))
        .cornerRadius(12)
    }
    
    private func reviewRow(_ review: Review) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "person.crop.circle")
                    .font(.title3).foregroundColor(.gray)
                Text(review.userName ?? "Anonymous")
                    .font(.subheadline.weight(.medium)).foregroundColor(.white)
                if userId == review.userId {
                    Text("Your review")
                        .font(.caption2)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.green.opacity(0.2))
                        .foregroundColor(.green)
                        .cornerRadius(6)
                }
                Spacer()
                Text(review.formattedDate).font(.caption).foregroundColor(.gray)
                
                if userId == review.userId {
                    Button {
                        Task { _ = await reviewsVM.delete(reviewId: review.id, userId: userId!) }
                    } label: {
                        Image(systemName: "trash").font(.caption).foregroundColor(.red)
                    }
                }
            }
            
            HStack(spacing: 2) {
                ForEach(0..<5, id: \.self) { i in
                    Image(systemName: i < review.rating ? "star.fill" : "star")
                        .font(.caption2)
                        .foregroundColor(i < review.rating ? .yellow : Color(white: 0.25))
                }
            }
            
            if let comment = review.comment, !comment.isEmpty {
                Text(comment).font(.subheadline).foregroundColor(Color(white: 0.8))
            }
        }
        .padding(14)
        .background(Color(white: 0.08))
        .cornerRadius(12)
    }
}

// MARK: - Flow Layout
struct FlowLayout: Layout {
    var spacing: CGFloat = 6
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                y += rowHeight + spacing
                x = 0
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        
        return CGSize(width: maxWidth, height: y + rowHeight)
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX && x > bounds.minX {
                y += rowHeight + spacing
                x = bounds.minX
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
