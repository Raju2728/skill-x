import { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, SlidersHorizontal, Sparkles, RefreshCw, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { userAPI, skillAPI } from '../../services/api';
import UserCard from '../../components/common/UserCard';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import './DiscoverPage.css';

const languageOptions = ['English', 'Tamil', 'Spanish', 'French', 'German', 'Japanese', 'Mandarin Chinese', 'Hindi'];
const experienceOptions = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

export default function DiscoverPage() {
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExperience, setSelectedExperience] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Fetch Categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const { data } = await skillAPI.getCategories();
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        search: search.trim() || undefined,
        category: selectedCategory || undefined,
        experience: selectedExperience || undefined,
        language: selectedLanguage || undefined,
        sort: sortBy,
      };

      const { data } = await userAPI.getUsers(params);
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to discover users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, selectedExperience, selectedLanguage, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedExperience('');
    setSelectedLanguage('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || selectedCategory || selectedExperience || selectedLanguage);

  return (
    <div className="discover-page animate-fade-in">
      <div className="discover-header">
        <div>
          <h1 className="discover-title">Discover Skill Partners</h1>
          <p className="discover-subtitle">
            Browse {totalCount} peers eager to exchange skills, knowledge, and collaborate.
          </p>
        </div>
      </div>

      {/* Main layout: Filter Sidebar + Results Grid */}
      <div className="discover-layout">
        {/* Filter Sidebar */}
        <aside className={`discover-sidebar ${showFiltersMobile ? 'discover-sidebar-open' : ''}`}>
          <div className="discover-sidebar-header">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-accent" />
              <h3>Filters</h3>
            </div>
            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                Reset
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="filter-group">
            <label className="filter-group-label">Category</label>
            <div className="category-filter-list">
              <button
                type="button"
                className={`cat-filter-btn ${!selectedCategory ? 'cat-filter-btn-active' : ''}`}
                onClick={() => { setSelectedCategory(''); setPage(1); }}
              >
                <span>All Categories</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-filter-btn ${selectedCategory === cat ? 'cat-filter-btn-active' : ''}`}
                  onClick={() => { setSelectedCategory(cat); setPage(1); }}
                >
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Experience level */}
          <div className="filter-group">
            <label className="filter-group-label">Experience Level</label>
            <select
              className="filter-select"
              value={selectedExperience}
              onChange={(e) => { setSelectedExperience(e.target.value); setPage(1); }}
            >
              {experienceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="filter-group">
            <label className="filter-group-label">Language</label>
            <select
              className="filter-select"
              value={selectedLanguage}
              onChange={(e) => { setSelectedLanguage(e.target.value); setPage(1); }}
            >
              <option value="">All Languages</option>
              {languageOptions.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </aside>

        {/* Results Main Content */}
        <div className="discover-content">
          {/* Search bar & Sort Controls */}
          <div className="discover-controls">
            <div className="discover-search-wrap">
              <Input
                icon={Search}
                placeholder="Search by name, skill, bio, or city..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <div className="discover-sort-wrap">
              <select
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recommended">Recommended (XP)</option>
                <option value="newest">Newest Members</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="active-chips-row">
              {selectedCategory && (
                <span className="filter-chip">
                  Category: {selectedCategory}
                  <X size={12} onClick={() => setSelectedCategory('')} />
                </span>
              )}
              {selectedExperience && (
                <span className="filter-chip">
                  Level: {selectedExperience}
                  <X size={12} onClick={() => setSelectedExperience('')} />
                </span>
              )}
              {selectedLanguage && (
                <span className="filter-chip">
                  Language: {selectedLanguage}
                  <X size={12} onClick={() => setSelectedLanguage('')} />
                </span>
              )}
              {search && (
                <span className="filter-chip">
                  "{search}"
                  <X size={12} onClick={() => setSearch('')} />
                </span>
              )}
            </div>
          )}

          {/* Grid or Empty State */}
          {loading ? (
            <PageLoader />
          ) : users.length === 0 ? (
            <div className="discover-empty-state">
              <Search size={40} className="text-tertiary mb-3" />
              <h3>No matching peers found</h3>
              <p>Try clearing some filters or searching for different keywords.</p>
              {hasActiveFilters && (
                <Button variant="secondary" onClick={handleClearFilters} className="mt-4">
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="discover-grid stagger-children">
              {users.map(u => (
                <UserCard key={u._id} user={u} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="discover-pagination">
              <Button
                variant="secondary"
                size="sm"
                icon={ChevronLeft}
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <span className="pagination-text">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                iconRight={ChevronRight}
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
