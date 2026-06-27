import React, { useState, useEffect, useRef } from "react";
import { Client } from "../types.ts";
import { apiService } from "../lib/api.ts";
import { MapPin, Phone, Mail, Navigation, Trash2, Plus, ArrowRight, Compass } from "lucide-react";

interface MapaClientesProps {
  clients: Client[];
  onClientAdded: () => void;
  onClientDeleted: () => void;
}

export default function MapaClientes({ clients, onClientAdded, onClientDeleted }: MapaClientesProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const tempMarkerRef = useRef<any | null>(null);
  const markersRef = useRef<Record<number, any>>({});

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Default coordinate center (e.g. Buenos Aires center)
  const defaultCenter: [number, number] = [-34.6037, -58.3816];

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Wait until window.L is available (Leaflet script loaded in index.html)
    if (!(window as any).L) {
      console.warn("Leaflet script is not available yet.");
      return;
    }

    const L = (window as any).L;

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current).setView(defaultCenter, 13);
    mapRef.current = map;

    // Add OpenStreetMap Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Click handler to drop a temporary pin and fill inputs
    map.on("click", (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      setLat(clickLat.toFixed(6));
      setLng(clickLng.toFixed(6));

      // Remove previous temp marker
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
      }

      // Create beautiful custom marker
      const tempIcon = L.divIcon({
        html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white shadow-xl animate-bounce border-2 border-white">
                 <span class="text-xs">📍</span>
               </div>`,
        className: "custom-temp-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      tempMarkerRef.current = L.marker([clickLat, clickLng], { icon: tempIcon })
        .addTo(map)
        .bindPopup("<b>Ubicación seleccionada</b><br/>Completa el formulario a la izquierda.")
        .openPopup();
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync clients with map markers
  useEffect(() => {
    if (!mapRef.current || !(window as any).L) return;
    const L = (window as any).L;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    // Add markers for all clients with lat/lng
    clients.forEach(client => {
      if (client.lat && client.lng) {
        const clientIcon = L.divIcon({
          html: `<div class="flex flex-col items-center">
                   <div class="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white shadow-lg border-2 border-white hover:scale-115 transition-transform">
                     <span class="text-xs">👤</span>
                   </div>
                   <div class="bg-indigo-950 text-white text-[10px] px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap font-medium border border-indigo-800">
                     ${client.name}
                   </div>
                 </div>`,
          className: "custom-client-icon",
          iconSize: [64, 48],
          iconAnchor: [32, 32],
        });

        const marker = L.marker([client.lat, client.lng], { icon: clientIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div class="p-1 font-sans">
              <h3 class="font-bold text-slate-900 border-b pb-1 mb-1 text-sm">${client.name}</h3>
              ${client.phone ? `<p class="text-xs text-slate-600 flex items-center gap-1">📞 ${client.phone}</p>` : ""}
              ${client.email ? `<p class="text-xs text-slate-600 flex items-center gap-1">✉️ ${client.email}</p>` : ""}
              <p class="text-[10px] text-slate-400 mt-1">Coordenadas: ${client.lat.toFixed(4)}, ${client.lng.toFixed(4)}</p>
            </div>
          `);

        markersRef.current[client.id] = marker;
      }
    });

    // Auto fit bounds if we have clients
    const validCoords = clients.filter(c => c.lat && c.lng).map(c => [c.lat!, c.lng!]);
    if (validCoords.length > 0 && mapRef.current) {
      try {
        const bounds = L.latLngBounds(validCoords);
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (err) {
        console.error("Error setting map bounds:", err);
      }
    }
  }, [clients]);

  // Handle fly to client
  const handleFlyTo = (client: Client) => {
    if (client.lat && client.lng && mapRef.current) {
      mapRef.current.flyTo([client.lat, client.lng], 15, {
        animate: true,
        duration: 1.5,
      });
      // Trigger popup
      const marker = markersRef.current[client.id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  // Get current location (GPS)
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("La geolocalización no es compatible con este navegador.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        setLat(currentLat.toFixed(6));
        setLng(currentLng.toFixed(6));
        setLoading(false);

        // Center map to current position
        if (mapRef.current) {
          mapRef.current.flyTo([currentLat, currentLng], 15);

          // Add temporary bounce pin
          const L = (window as any).L;
          if (L) {
            if (tempMarkerRef.current) tempMarkerRef.current.remove();

            const myIcon = L.divIcon({
              html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white shadow-xl animate-bounce border-2 border-white">
                       <span class="text-xs">🌟</span>
                     </div>`,
              className: "custom-my-icon",
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            });

            tempMarkerRef.current = L.marker([currentLat, currentLng], { icon: myIcon })
              .addTo(mapRef.current)
              .bindPopup("<b>¡Estás aquí!</b><br/>Coordenadas cargadas para el cliente.")
              .openPopup();
          }
        }
      },
      (error) => {
        setLoading(false);
        console.error("Error getting location:", error);
        setErrorMsg("Permiso de GPS denegado o señal débil.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit Client Register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("El nombre del cliente es obligatorio.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await apiService.createClient({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
      });

      setName("");
      setPhone("");
      setEmail("");
      setLat("");
      setLng("");

      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }

      setSuccessMsg("¡Cliente registrado con éxito!");
      onClientAdded();

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Error al guardar el cliente.");
    } finally {
      setLoading(false);
    }
  };

  // Delete client
  const handleDeleteClient = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;

    try {
      await apiService.deleteClient(id);
      onClientDeleted();
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo eliminar el cliente.");
    }
  };

  return (
    <div id="mapa-section" class="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Col 1: Registration Form & Client List */}
      <div class="lg:col-span-1 flex flex-col gap-6">
        
        {/* Registration Card */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h2 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Plus class="w-5 h-5 text-indigo-600" />
            Registrar Nuevo Cliente
          </h2>

          <form onSubmit={handleSubmit} class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Pastelería El Sol"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej. +54 9 11 1234-5678"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ej. sol@pasteleria.com"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Latitud</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="Hacer clic en mapa"
                  class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Longitud</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  placeholder="Hacer clic en mapa"
                  class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                />
              </div>
            </div>

            {/* GPS Trigger Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={loading}
              class="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100/80 active:bg-indigo-100 text-indigo-700 font-semibold py-2 px-4 rounded-lg transition-colors text-xs cursor-pointer"
            >
              <Compass class="w-4 h-4" />
              {loading ? "Obteniendo GPS..." : "Capturar Ubicación Actual (GPS)"}
            </button>

            {errorMsg && <div class="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg font-medium">{errorMsg}</div>}
            {successMsg && <div class="text-xs text-emerald-500 bg-emerald-50 p-2.5 rounded-lg font-medium">{successMsg}</div>}

            <button
              type="submit"
              disabled={loading}
              class="w-full bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              Registrar Cliente
            </button>
          </form>
        </div>

        {/* Clients Directory Panel */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col min-h-[300px]">
          <h2 class="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Directorio de Clientes</h2>
          <div class="space-y-2 overflow-y-auto max-h-[350px] flex-1 pr-1">
            {clients.length === 0 ? (
              <p class="text-xs text-slate-400 text-center py-8">No hay clientes registrados aún.</p>
            ) : (
              clients.map(client => (
                <div
                  key={client.id}
                  onClick={() => handleFlyTo(client)}
                  class="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div class="flex-1 min-w-0 pr-2">
                    <h3 class="text-xs font-bold text-slate-800 truncate">{client.name}</h3>
                    <div class="flex flex-col gap-0.5 mt-1 text-[10px] text-slate-500">
                      {client.phone && <span class="flex items-center gap-1"><Phone class="w-2.5 h-2.5" /> {client.phone}</span>}
                      {client.email && <span class="flex items-center gap-1"><Mail class="w-2.5 h-2.5" /> {client.email}</span>}
                      {client.lat && <span class="flex items-center gap-1"><MapPin class="w-2.5 h-2.5 text-indigo-500" /> Ver en Mapa (centrar)</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClient(client.id, e)}
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Eliminar Cliente"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Col 2-3: Leaflet OpenStreetMap Canvas */}
      <div class="lg:col-span-2 flex flex-col gap-4">
        <div class="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm h-[600px] flex flex-col">
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-100/80 mb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 class="text-xs font-bold text-slate-800">Mapa Georreferencial de Despachos</h3>
              <p class="text-[10px] text-slate-500 mt-0.5">Haz clic en cualquier parte del mapa para fijar una coordenada exacta de cliente.</p>
            </div>
            <span class="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded-full self-start md:self-auto border border-indigo-100">
              🟢 OSM/Leaflet Activo (Pines Libres)
            </span>
          </div>
          
          <div
            ref={mapContainerRef}
            class="w-full flex-1 rounded-xl shadow-inner border border-slate-200 overflow-hidden relative"
            style={{ zIndex: 1 }}
          >
            {/* Fallback indicator if window.L is missing */}
            {!(window as any).L && (
              <div class="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-sm font-medium">
                Cargando OpenStreetMap...
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
