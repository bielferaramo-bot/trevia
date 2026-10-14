import React, { useState } from 'react';
import { useLocation } from '../LocationContext.jsx';
import { JOINVILLE_COORDINATES, CITIES_COORDINATES } from '../data/geoCoordinates.js';
import {
  MapPin,
  Navigation,
  Search,
  X,
  Check,
  ChevronRight,
  Compass,
  AlertCircle
} from 'lucide-react';

export default function LocationModal() {
  const {
    userLocation,
    setLocation,
    requestGpsLocation,
    gpsLoading,
    gpsError,
    isLocationModalOpen,
    closeLocationModal
  } = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAllBairros, setShowAllBairros] = useState(false);

  if (!isLocationModalOpen) return null;

  const popularNeighborhoods = [
    'Centro',
    'América',
    'Glória',
    'Costa e Silva',
    'Anita Garibaldi',
    'Saguaçu',
    'Vila Nova',
    'Aventureiro',
    'Pirabeiraba'
  ];

  const allNeighborhoods = Object.keys(JOINVILLE_COORDINATES).sort((a, b) => a.localeCompare(b));
  const cities = Object.keys(CITIES_COORDINATES);

  // Filtro de busca
  const filteredBairros = searchTerm.trim()
    ? allNeighborhoods.filter(b => b.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const filteredCities = searchTerm.trim()
    ? cities.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Estilo OLX */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>Onde você está?</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha sua região para ver serviços com distância exata em metros e km
            </p>
          </div>
          <button
            onClick={closeLocationModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Botão GPS "Usar minha localização atual" */}
          <div>
            <button
              onClick={requestGpsLocation}
              disabled={gpsLoading}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-sm hover:from-emerald-600 hover:to-teal-700 active:scale-98 transition-all flex items-center justify-center space-x-2.5 disabled:opacity-60"
            >
              <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{gpsLoading ? 'Detectando localização...' : 'Usar minha localização atual (GPS)'}</span>
            </button>

            {gpsError && (
              <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do seu bairro ou cidade..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Resultados da Busca */}
          {searchTerm.trim() ? (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Resultados correspondentes:
              </span>

              {filteredBairros.length === 0 && filteredCities.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Nenhum bairro ou cidade encontrado para "{searchTerm}".
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto rounded-xl border border-slate-100">
                  {filteredBairros.map((b) => (
                    <button
                      key={b}
                      onClick={() => setLocation({ city: 'Joinville', neighborhood: b })}
                      className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{b}, Joinville</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}

                  {filteredCities.map((c) => (
                    <button
                      key={c}
                      onClick={() => setLocation({ city: c, neighborhood: '' })}
                      className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Compass className="w-3.5 h-3.5 text-teal-600" />
                        <span>{c} (Toda a cidade)</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Opção Padrão: Toda Joinville e Região */}
              <button
                onClick={() => setLocation({ city: 'Joinville', neighborhood: '', isGps: false })}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  !userLocation.neighborhood && userLocation.city === 'Joinville' && !userLocation.isGps
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold block">Toda Joinville e Região</span>
                    <span className="text-[10px] text-slate-500">Ver todas as oportunidades sem restrição de bairro</span>
                  </div>
                </div>
                {!userLocation.neighborhood && userLocation.city === 'Joinville' && !userLocation.isGps && (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
              </button>

              {/* Bairros mais buscados de Joinville */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Bairros mais buscados de Joinville:
                </span>
                <div className="flex flex-wrap gap-2">
                  {popularNeighborhoods.map((b) => {
                    const isSelected = userLocation.neighborhood === b;
                    return (
                      <button
                        key={b}
                        onClick={() => setLocation({ city: 'Joinville', neighborhood: b })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cidades Vizinhas */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cidades vizinhas atendidas:
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Araquari', 'Jaraguá do Sul', 'São Francisco do Sul', 'Guaramirim', 'Barra Velha'].map((c) => {
                    const isSelected = userLocation.city === c && !userLocation.neighborhood;
                    return (
                      <button
                        key={c}
                        onClick={() => setLocation({ city: c, neighborhood: '' })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-700 font-bold shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Todos os 32 bairros de Joinville */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAllBairros(!showAllBairros)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center justify-between w-full py-1"
                >
                  <span>Ver todos os 32 bairros de Joinville</span>
                  <span className="text-slate-400 text-[11px]">{showAllBairros ? '▲ Recolher' : '▼ Expandir'}</span>
                </button>

                {showAllBairros && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-3 max-h-48 overflow-y-auto">
                    {allNeighborhoods.map((b) => (
                      <button
                        key={b}
                        onClick={() => setLocation({ city: 'Joinville', neighborhood: b })}
                        className={`px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors truncate ${
                          userLocation.neighborhood === b
                            ? 'bg-emerald-100 text-emerald-900 font-bold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        title={b}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
