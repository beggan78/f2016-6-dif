import React, { useState, useEffect } from 'react';
import { Button, Card, Input } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
import { useTranslation } from 'react-i18next';
import { Users, Building2, UserPlus, Clock, CheckCircle, XCircle, Search } from 'lucide-react';

export function ClubMembershipManager() {
  const { t } = useTranslation('team');
  const {
    searchClubs,
    joinClub,
    getClubMemberships,
    getPendingClubRequests,
    approveClubMembership,
    rejectClubMembership,
    loading,
    error
  } = useTeam();

  const [activeTab, setActiveTab] = useState('my-clubs');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load user's club memberships on mount
  useEffect(() => {
    loadMyClubs();
    loadPendingRequests();
  }, []);

  const loadMyClubs = async () => {
    const clubs = await getClubMemberships();
    setMyClubs(clubs);
  };

  const loadPendingRequests = async () => {
    const requests = await getPendingClubRequests();
    setPendingRequests(requests);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchClubs(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoinClub = async (clubId) => {
    const result = await joinClub(clubId);
    if (result) {
      // Show success message and refresh search results
      setSearchResults(prev => 
        prev.map(club => 
          club.id === clubId 
            ? { ...club, membershipJoined: true }
            : club
        )
      );
      // Refresh club memberships to show newly joined club
      loadMyClubs();
    }
  };

  const handleApproveRequest = async (requestId, role) => {
    const result = await approveClubMembership(requestId, role);
    if (result) {
      await loadPendingRequests();
      await loadMyClubs();
    }
  };

  const handleRejectRequest = async (requestId, notes) => {
    const result = await rejectClubMembership(requestId, notes);
    if (result) {
      await loadPendingRequests();
    }
  };

  const renderMyClubs = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-sky-300 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t('clubMembership.myClubs.title')}
        </h3>
      </div>

      {myClubs.length === 0 ? (
        <Card className="text-center py-8">
          <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">{t('clubMembership.myClubs.empty')}</p>
          <p className="text-slate-500 text-sm">
            {t('clubMembership.myClubs.emptyHint')}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {myClubs.map((membership) => (
            <Card key={membership.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-100">
                    {membership.club.name}
                  </h4>
                  {membership.club.long_name && (
                    <p className="text-sm text-slate-400">
                      {membership.club.long_name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      membership.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : membership.role === 'coach'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {membership.role}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t('clubMembership.myClubs.joined', { date: new Date(membership.joined_at).toLocaleDateString() })}
                    </span>
                  </div>
                </div>
                <Users className="h-5 w-5 text-slate-400" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderClubSearch = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-sky-300 flex items-center gap-2">
          <Search className="h-5 w-5" />
          {t('clubMembership.search.title')}
        </h3>
      </div>

      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('clubMembership.search.placeholder')}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
        >
          {isSearching ? t('clubMembership.search.searching') : t('clubMembership.search.searchButton')}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-200">{t('clubMembership.search.resultsTitle')}</h4>
          {searchResults.map((club) => (
            <Card key={club.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-100">{club.name}</h4>
                  {club.long_name && (
                    <p className="text-sm text-slate-400">{club.long_name}</p>
                  )}
                  {club.short_name && (
                    <p className="text-xs text-slate-500">({club.short_name})</p>
                  )}
                </div>
                <div>
                  {club.membershipJoined ? (
                    <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-emerald-100 text-emerald-800">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t('clubMembership.search.joined')}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleJoinClub(club.id)}
                      disabled={loading}
                      Icon={UserPlus}
                    >
                      {t('clubMembership.search.joinClub')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {searchQuery && searchResults.length === 0 && !isSearching && (
        <Card className="text-center py-6">
          <p className="text-slate-400">{t('clubMembership.search.noResults', { query: searchQuery })}</p>
          <p className="text-slate-500 text-sm mt-2">
            {t('clubMembership.search.noResultsHint')}
          </p>
        </Card>
      )}
    </div>
  );

  const renderPendingRequests = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-sky-300 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('clubMembership.requests.title')}
          {pendingRequests.length > 0 && (
            <span className="bg-amber-500 text-amber-900 text-xs px-2 py-1 rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </h3>
      </div>

      {pendingRequests.length === 0 ? (
        <Card className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">{t('clubMembership.requests.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <h4 className="font-medium text-slate-100">
                        {request.user.name}
                      </h4>
                      <p className="text-sm text-slate-400">
                        {t('clubMembership.requests.wantsToJoin', { clubName: request.club.name })}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t('clubMembership.requests.requested', { date: new Date(request.created_at).toLocaleDateString() })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRejectRequest(request.id, 'Request declined')}
                    disabled={loading}
                    Icon={XCircle}
                  >
                    {t('clubMembership.requests.reject')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveRequest(request.id, 'member')}
                    disabled={loading}
                    Icon={CheckCircle}
                  >
                    {t('clubMembership.requests.approve')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'my-clubs', label: t('clubMembership.tabs.myClubs'), count: myClubs.length },
    { id: 'search', label: t('clubMembership.tabs.findClubs'), count: null },
    { id: 'pending', label: t('clubMembership.tabs.requests'), count: pendingRequests.length }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Building2 className="h-8 w-8 text-sky-400 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-sky-300">{t('clubMembership.title')}</h2>
        <p className="text-slate-400 text-sm mt-2">
          {t('clubMembership.subtitle')}
        </p>
      </div>

      {error && (
        <Card className="p-4 bg-rose-50 border-rose-200">
          <p className="text-rose-800 text-sm">{error}</p>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-600 text-slate-100'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-600'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="bg-sky-500 text-sky-100 text-xs px-2 py-1 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'my-clubs' && renderMyClubs()}
        {activeTab === 'search' && renderClubSearch()}
        {activeTab === 'pending' && renderPendingRequests()}
      </div>
    </div>
  );
}
