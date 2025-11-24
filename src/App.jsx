import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Send, Navigation, Copy, Check, ArrowRight, User } from 'lucide-react';

export default function OMWTracker() {
  const [firstName, setFirstName] = useState('');
  const [profession, setProfession] = useState('');
  const [destination, setDestination] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [shareableLink, setShareableLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const destinationInputRef = useRef(null);

  // Load saved profile on mount
  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem('omw_profile') || '{}');
    if (savedProfile.firstName) {
      setFirstName(savedProfile.firstName);
      setProfession(savedProfile.profession || '');
      setProfileSaved(true);
    }
  }, []);

  // Save profile whenever it changes
  useEffect(() => {
    if (firstName) {
      localStorage.setItem('omw_profile', JSON.stringify({ firstName, profession }));
    }
  }, [firstName, profession]);

  // Load Google Maps script
  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      const apiKey = 'AIzaSyBZJEu8eCZsq5wImZ8dhoyeXSqDYfBbR2g';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        initializeAutocomplete();
      };
    } else {
      initializeAutocomplete();
    }
  }, []);

  // Initialize Google Places Autocomplete
  // Initialize Google Places Autocomplete
const initializeAutocomplete = () => {
  if (!window.google || !destinationInputRef.current || autocompleteRef.current) return;

  autocompleteRef.current = new window.google.maps.places.Autocomplete(
    destinationInputRef.current,
    {
      types: ['address'],
      componentRestrictions: { country: 'us' }
    }
  );

  autocompleteRef.current.addListener('place_changed', () => {
    const place = autocompleteRef.current.getPlace();
    if (place.formatted_address) {
      setDestination(place.formatted_address);
    }
  });

  // Add custom styles for autocomplete dropdown
  const style = document.createElement('style');
  style.textContent = `
    .pac-container {
      background-color: #000000 !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 16px !important;
      margin-top: 4px !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
    }
    .pac-item {
      background-color: #000000 !important;
      color: #ffffff !important;
      border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
      padding: 12px !important;
      cursor: pointer !important;
    }
    .pac-item:hover {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
    .pac-item-query {
      color: #ffffff !important;
      font-size: 14px !important;
    }
    .pac-matched {
      color: #ffffff !important;
      font-weight: 600 !important;
    }
    .pac-icon {
      display: none !important;
    }
    .pac-item-query .pac-matched {
      color: #4ade80 !important;
    }
  `;
  document.head.appendChild(style);
};

  // Initialize map when tracking starts
  useEffect(() => {
    if (isTracking && mapRef.current && window.google && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [isTracking]);

  // Track location
  useEffect(() => {
    let watchId;
    
    if (isTracking && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);
          updateMapWithCurrentLocation(newLocation);
          calculateRoute(newLocation);
        },
        (error) => {
          setError('Unable to get location: ' + error.message);
        },
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearPosition(watchId);
      }
    };
  }, [isTracking, destination]);

  const initializeMap = () => {
    if (!window.google || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: currentLocation || { lat: 40.7589, lng: -73.9851 },
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }]
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }]
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }]
        }
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    mapInstanceRef.current = map;
  };

  const updateMapWithCurrentLocation = (location) => {
    if (!mapInstanceRef.current || !window.google) return;

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setPosition(location);
    } else {
      currentLocationMarkerRef.current = new window.google.maps.Marker({
        position: location,
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4ade80",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3
        },
        title: "Your Location"
      });
    }

    mapInstanceRef.current.setCenter(location);
  };

  const calculateRoute = async (startLocation) => {
    if (!window.google || !destination) return;

    // Clear existing route
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    try {
      // Use Directions API for actual driving route
      const directionsService = new window.google.maps.DirectionsService();
      
      const request = {
        origin: new window.google.maps.LatLng(startLocation.lat, startLocation.lng),
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL
      };

      const result = await new Promise((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === 'OK') {
            resolve(result);
          } else {
            reject(status);
          }
        });
      });

      // Clear old destination marker
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
      }

      // Add destination marker
      const endLocation = result.routes[0].legs[0].end_location;
      destinationMarkerRef.current = new window.google.maps.Marker({
        position: endLocation,
        map: mapInstanceRef.current,
        title: destination
      });

      // Draw the actual route path
      const path = result.routes[0].overview_path;
      routePolylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#ffffff',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: mapInstanceRef.current
      });

      // Get distance and duration from Directions API
      const leg = result.routes[0].legs[0];
      const miles = leg.distance.value * 0.000621371; // Convert meters to miles
      const minutes = Math.round(leg.duration.value / 60); // Convert seconds to minutes

      setDistance(miles);
      setEta(minutes);

      // Fit map to show entire route
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      mapInstanceRef.current.fitBounds(bounds);

    } catch (err) {
      console.error('Error calculating route:', err);
      setError('Could not calculate route. Please check address.');
    }
  };

  const startTracking = () => {
    if (!firstName) {
      setError('Please enter your first name');
      return;
    }
    if (!destination) {
      setError('Please enter a destination');
      return;
    }

    setError('');
    setIsTracking(true);
    
    const trackingId = Math.random().toString(36).substr(2, 9);
    const link = `${window.location.origin}/track/${trackingId}`;
    setShareableLink(link);
  };

  const sendTextMessage = async () => {
  if (!phoneNumber) {
    setError('Please enter a phone number');
    return;
  }

  try {
    // Calculate arrival time
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + (eta * 60000)); // Add ETA in milliseconds
    const timeString = arrivalTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    const professionText = profession ? `${profession} ` : '';
    const message = `${professionText}${firstName} ETA in ${eta} min at ${timeString} click to see map ${shareableLink}`;

    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber,
        message,
        firstName,
        profession,
        trackingLink: shareableLink
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Message sent successfully! ✓');
      setError('');
    } else {
      setError('Failed to send message: ' + data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    // Fallback to native SMS app if API fails
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + (eta * 60000));
    const timeString = arrivalTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const professionText = profession ? `${profession} ` : '';
    const message = `${professionText}${firstName} ETA in ${eta} min at ${timeString} click to see map ${shareableLink}`;
    window.location.href = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
  }
};

      const data = await response.json();
      
      if (data.success) {
        alert('Message sent successfully! ✓');
        setError('');
      } else {
        setError('Failed to send message: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      const professionText = profession ? ` (${profession})` : '';
      const message = `Hi! ${firstName}${professionText} is on the way. Track my location here: ${shareableLink}`;
      window.location.href = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stopTracking = () => {
    setIsTracking(false);
    setCurrentLocation(null);
    setEta(null);
    setDistance(null);
    
    if (mapInstanceRef.current) {
      if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(null);
      if (routePolylineRef.current) routePolylineRef.current.setMap(null);
      if (currentLocationMarkerRef.current) currentLocationMarkerRef.current.setMap(null);
      mapInstanceRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto pt-8">
        
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="w-7 h-7 text-white" strokeWidth={2} />
            <h1 className="text-4xl font-bold tracking-tight">OMW <span className="text-2xl font-normal text-gray-500">(on my way.)</span></h1>
          </div>
          <p className="text-gray-400 text-sm ml-9">Schedule Optimization for Contractors and Tenants</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {!isTracking ? (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Your Profile</span>
                {profileSaved && (
                  <span className="ml-auto text-xs text-green-400">Saved</span>
                )}
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors placeholder-gray-600"
                />
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Profession (e.g., Plumber, Electrician)"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors placeholder-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-3">
                Where to?
              </label>
              <input
                ref={destinationInputRef}
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination address"
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-white/30 transition-colors placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-3">
                Notify (optional)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 XXX XXX XXXX"
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-white/30 transition-colors placeholder-gray-600"
              />
            </div>

            <button
              onClick={startTracking}
              className="w-full mt-8 bg-white text-black font-semibold py-5 rounded-2xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 group"
            >
              Start sharing
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
              <div 
                ref={mapRef} 
                className="w-full h-96"
                style={{ minHeight: '384px' }}
              />
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-400">Live</span>
                </div>
                <div className="text-sm text-gray-400">
                  {firstName}{profession && ` • ${profession}`}
                </div>
              </div>
              
              {eta && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">ETA</div>
                    <div className="text-4xl font-bold">{eta}<span className="text-lg text-gray-500 ml-1">min</span></div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Distance</div>
                    <div className="text-4xl font-bold">{distance?.toFixed(1)}<span className="text-lg text-gray-500 ml-1">mi</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Share link</div>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 bg-black/50 rounded-xl text-sm font-mono text-gray-400 truncate">
                  {shareableLink}
                </div>
                <button
                  onClick={copyLink}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {phoneNumber && (
              <button
                onClick={sendTextMessage}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send message
              </button>
            )}

            <button
              onClick={stopTracking}
              className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white font-medium py-4 rounded-2xl transition-all"
            >
              Stop sharing
            </button>
          </div>
        )}

        <div className="mt-16 pt-6 border-t border-white/10">
          <p className="text-xs text-gray-600 leading-relaxed">
            Live location tracking with Google Maps integration
          </p>
        </div>
      </div>
    </div>
  );
}
