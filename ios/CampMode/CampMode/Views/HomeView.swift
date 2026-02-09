import SwiftUI
import MapKit
import CoreLocation

struct HomeView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var savedPlaces: SavedPlacesManager
    @StateObject private var mapVM = MapViewModel()
    @StateObject private var locationManager = LocationManager()
    @StateObject private var reviewsVM = ReviewsViewModel()
    
    @State private var showUserMenu = false
    @State private var showSettings = false
    @State private var showSavedPlaces = false
    @State private var showTrips = false
    @State private var showAddToTrip = false
    @State private var addToTripLocation: CampLocation?
    @State private var showRouteHint = false
    @State private var searchText = ""
    @State private var showSearchResults = false
    @State private var searchResults: [GeocodingResult] = []
    @State private var searchTask: Task<Void, Never>?
    @State private var userSetLocation: CLLocation?
    
    var effectiveUserLocation: CLLocation? {
        userSetLocation ?? locationManager.userLocation
    }
    
    var body: some View {
        ZStack {
            // Map (always rendered)
            mapLayer
                .opacity(mapVM.viewMode == .map ? 1 : 0)
            
            // List view
            if mapVM.viewMode == .list {
                listLayer
            }
            
            // Top overlay
            VStack(spacing: 0) {
                topControls
                Spacer()
            }
            
            // Route planner sheet
            // (handled via .sheet)
        }
        .sheet(item: $mapVM.selectedLocation) { location in
            LocationDetailSheet(
                location: location,
                reviewsVM: reviewsVM,
                userLocation: effectiveUserLocation,
                isInRoute: mapVM.isInRoute(location),
                isSaved: savedPlaces.isSaved(location.id),
                onAddToRoute: { mapVM.addToRoute(location) },
                onRemoveFromRoute: { mapVM.removeFromRoute(location) },
                onSave: { savedPlaces.addSaved(location) },
                onUnsave: { savedPlaces.removeSaved(location.id) },
                onAddToTrip: {
                    addToTripLocation = location
                    showAddToTrip = true
                },
                onNavigate: { openNavigation(location) },
                userId: authVM.user?.id
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $mapVM.showRoutePlanner) {
            RoutePlannerSheet(mapVM: mapVM)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showAddToTrip) {
            if let loc = addToTripLocation {
                AddToTripSheet(location: loc, userId: authVM.user?.id)
            }
        }
        .fullScreenCover(isPresented: $showSettings) {
            SettingsView()
        }
        .fullScreenCover(isPresented: $showSavedPlaces) {
            SavedPlacesView(onSelect: { loc in
                showSavedPlaces = false
                mapVM.selectedLocation = loc
                mapVM.centerOnLocation(loc)
            })
        }
        .fullScreenCover(isPresented: $showTrips) {
            TripsView(mapVM: mapVM, onDismiss: { showTrips = false })
        }
        .task { await mapVM.loadLocations() }
    }
    
    // MARK: - Map Layer
    private var mapLayer: some View {
        CampMapView(
            locations: mapVM.filteredLocations,
            selectedLocation: $mapVM.selectedLocation,
            region: $mapVM.mapRegion,
            userLocation: effectiveUserLocation?.coordinate,
            routeStops: mapVM.routeStops,
            top10Ids: mapVM.top10Ids,
            crownIds: mapVM.crownIds
        )
        .ignoresSafeArea()
    }
    
    // MARK: - List Layer
    private var listLayer: some View {
        VStack(spacing: 0) {
            Spacer().frame(height: 200) // space for top controls
            
            if effectiveUserLocation != nil {
                HStack {
                    Spacer()
                    Picker("Sort", selection: $mapVM.listSortMode) {
                        Text("Quality").tag(MapViewModel.SortMode.quality)
                        Text("Nearest").tag(MapViewModel.SortMode.distance)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 200)
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
            }
            
            LocationListView(
                locations: mapVM.sortedForList(userLocation: effectiveUserLocation),
                userLocation: effectiveUserLocation,
                top10Ids: mapVM.top10Ids,
                crownIds: mapVM.crownIds,
                onSelect: { loc in
                    mapVM.selectedLocation = loc
                }
            )
        }
        .background(Color(red: 0.05, green: 0.05, blue: 0.05))
    }
    
    // MARK: - Top Controls
    private var topControls: some View {
        VStack(spacing: 12) {
            // Search row
            HStack(spacing: 12) {
                searchBar
                
                // Route button
                Button {
                    if mapVM.routeStops.isEmpty {
                        showRouteHint.toggle()
                    } else {
                        mapVM.showRoutePlanner.toggle()
                    }
                } label: {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: "point.topleft.down.to.point.bottomright.curvepath")
                            .font(.system(size: 18))
                            .frame(width: 44, height: 44)
                            .background(mapVM.routeStops.isEmpty ? Color(white: 0.15) : Color.green.opacity(0.2))
                            .foregroundColor(mapVM.routeStops.isEmpty ? .gray : .green)
                            .cornerRadius(12)
                        
                        if !mapVM.routeStops.isEmpty {
                            Text("\(mapVM.routeStops.count)")
                                .font(.caption2.bold())
                                .foregroundColor(.white)
                                .frame(width: 18, height: 18)
                                .background(Color.green)
                                .clipShape(Circle())
                                .offset(x: 4, y: -4)
                        }
                    }
                }
                .popover(isPresented: $showRouteHint) {
                    Text("Add locations to your route first. Tap a place on the map, then tap \"Add to route\".")
                        .font(.subheadline)
                        .padding()
                        .frame(width: 260)
                        .presentationCompactAdaptation(.popover)
                }
                
                // User menu
                userMenuButton
            }
            
            // Filter pills
            FilterPillsView(
                selectedTypes: $mapVM.selectedTypes,
                counts: mapVM.counts,
                onToggle: { type in mapVM.toggleType(type) }
            )
            
            // View toggle
            HStack(spacing: 8) {
                viewToggleButton("Map", icon: "map", mode: .map)
                viewToggleButton("List", icon: "list.bullet", mode: .list)
                Spacer()
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 16)
        .background(
            LinearGradient(
                colors: [Color.black.opacity(0.9), Color.black.opacity(0.6), .clear],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
    
    // MARK: - Search Bar
    private var searchBar: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("Search locations...", text: $searchText, onEditingChanged: { editing in
                    showSearchResults = editing
                })
                .foregroundColor(.white)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .onChange(of: searchText) { _, newValue in
                    mapVM.searchQuery = newValue
                    mapVM.applyFilters()
                    debounceSearch(newValue)
                }
                
                if userSetLocation != nil {
                    Button {
                        userSetLocation = nil
                        searchText = ""
                        mapVM.searchQuery = ""
                        mapVM.applyFilters()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.caption)
                            .foregroundColor(.blue)
                            .frame(width: 28, height: 28)
                            .background(Color.blue.opacity(0.2))
                            .clipShape(Circle())
                    }
                }
            }
            .padding(.horizontal, 16)
            .frame(height: 48)
            .background(Color(white: 0.08).opacity(0.9))
            .cornerRadius(24)
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color(white: 0.15)))
            
            if showSearchResults {
                searchDropdown
            }
        }
    }
    
    private var searchDropdown: some View {
        VStack(spacing: 0) {
            // Use my location
            Button {
                locationManager.requestPermission()
                locationManager.requestLocation()
                if let loc = locationManager.userLocation {
                    userSetLocation = loc
                    mapVM.mapRegion = MKCoordinateRegion(center: loc.coordinate, span: MKCoordinateSpan(latitudeDelta: 0.3, longitudeDelta: 0.3))
                }
                searchText = ""
                mapVM.searchQuery = ""
                mapVM.applyFilters()
                showSearchResults = false
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "location.fill")
                        .frame(width: 40, height: 40)
                        .background(Color.blue.opacity(0.2))
                        .foregroundColor(.blue)
                        .clipShape(Circle())
                    VStack(alignment: .leading) {
                        Text("Use my location").foregroundColor(.white).font(.subheadline.weight(.medium))
                        Text("Find places near you").foregroundColor(.gray).font(.caption)
                    }
                    Spacer()
                }
                .padding(.horizontal, 16).padding(.vertical, 12)
            }
            
            Divider().background(Color(white: 0.2))
            
            // Suggestions
            ForEach(searchResults) { result in
                Button {
                    if let coord = result.coordinate {
                        let loc = CLLocation(latitude: coord.latitude, longitude: coord.longitude)
                        userSetLocation = loc
                        mapVM.mapRegion = MKCoordinateRegion(center: coord, span: MKCoordinateSpan(latitudeDelta: 0.3, longitudeDelta: 0.3))
                        searchText = result.shortName
                        mapVM.searchQuery = ""
                        mapVM.applyFilters()
                    }
                    showSearchResults = false
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "mappin")
                            .frame(width: 40, height: 40)
                            .background(Color(white: 0.15))
                            .foregroundColor(.gray)
                            .clipShape(Circle())
                        VStack(alignment: .leading) {
                            Text(result.shortName).foregroundColor(.white).font(.subheadline).lineLimit(1)
                            Text(result.subtitle).foregroundColor(.gray).font(.caption).lineLimit(1)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 16).padding(.vertical, 10)
                }
            }
        }
        .background(Color(white: 0.08).opacity(0.95))
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(white: 0.15)))
        .shadow(color: .black.opacity(0.5), radius: 20)
        .padding(.top, 4)
    }
    
    // MARK: - User Menu Button
    private var userMenuButton: some View {
        Menu {
            if authVM.isSignedIn {
                Section {
                    Text(authVM.displayName)
                    Text(authVM.user?.email ?? "")
                }
                Button { showSavedPlaces = true } label: { Label("Saved Places", systemImage: "heart") }
                Button { showTrips = true } label: { Label("My Trips", systemImage: "point.topleft.down.to.point.bottomright.curvepath") }
                Button { showSettings = true } label: { Label("Settings", systemImage: "gearshape") }
                Divider()
                Button(role: .destructive) { authVM.signOut() } label: { Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right") }
            } else {
                Button { showSettings = true } label: { Label("Settings", systemImage: "gearshape") }
            }
        } label: {
            Text(authVM.isSignedIn ? authVM.userInitial : "")
                .font(.headline)
                .foregroundColor(.white)
                .frame(width: 44, height: 44)
                .background(
                    LinearGradient(colors: [.green, .green.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .clipShape(Circle())
                .overlay(
                    Group {
                        if !authVM.isSignedIn {
                            Image(systemName: "person.crop.circle")
                                .font(.system(size: 20))
                                .foregroundColor(.white)
                        }
                    }
                )
                .shadow(color: .green.opacity(0.3), radius: 8)
        }
    }
    
    // MARK: - View Toggle
    private func viewToggleButton(_ title: String, icon: String, mode: MapViewModel.ViewMode) -> some View {
        Button {
            mapVM.viewMode = mode
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 14))
                Text(title).font(.subheadline.weight(.medium))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                mapVM.viewMode == mode
                ? Color.green.opacity(0.55)
                : Color(white: 0.15).opacity(0.8)
            )
            .foregroundColor(mapVM.viewMode == mode ? .white : .gray)
            .cornerRadius(20)
            .overlay(
                mapVM.viewMode == mode
                ? RoundedRectangle(cornerRadius: 20).stroke(Color.green.opacity(0.25))
                : nil
            )
        }
    }
    
    // MARK: - Helpers
    private func debounceSearch(_ query: String) {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            if query.count > 2 {
                do {
                    let results = try await GeocodingService.shared.search(query: query)
                    await MainActor.run { searchResults = results }
                } catch {}
            } else {
                await MainActor.run { searchResults = [] }
            }
        }
    }
    
    private func openNavigation(_ location: CampLocation) {
        let placemark = MKPlacemark(coordinate: location.coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = location.name
        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
    }
}
