const heroTitle = document.getElementById('hero-title');
const heroOverview = document.getElementById('hero-overview');
const trendingRow = document.getElementById('trending-row');
const heroSection = document.querySelector('.hero');

const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';
const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

async function loadTrending() {
  try {
    const res = await fetch('/api/movies');
    if (!res.ok) {
      throw new Error('Failed to load movies');
    }
    const data = await res.json();
    const movies = data.results || [];

    // Only keep movies that have at least a backdrop or poster image
    const usableMovies = movies.filter(
      (m) => m.backdrop_path || m.poster_path
    );

    if (usableMovies.length > 0) {
      const featured = usableMovies[0];
      heroTitle.textContent = featured.title || featured.name || 'Featured Movie';
      heroOverview.textContent = featured.overview || 'No description available.';

      const backdropPath = featured.backdrop_path || featured.poster_path;
      if (heroSection && backdropPath) {
        heroSection.style.backgroundImage = `url(${TMDB_BACKDROP_BASE}${backdropPath})`;
      }
    }

    trendingRow.innerHTML = '';

    usableMovies.forEach((movie) => {
      if (!movie.poster_path) {
        // Skip cards without a poster image for a more cinematic row
        return;
      }

      const card = document.createElement('div');
      card.className = 'movie-card';

      const img = document.createElement('img');
      img.src = `${TMDB_POSTER_BASE}${movie.poster_path}`;
      img.alt = movie.title || movie.name || '';

      const body = document.createElement('div');
      body.className = 'movie-card-body';

      const title = document.createElement('div');
      title.className = 'movie-card-title';
      title.textContent = movie.title || movie.name || 'Untitled';

      const meta = document.createElement('div');
      meta.className = 'movie-card-meta';
      meta.textContent = movie.release_date || movie.first_air_date || '';

      body.appendChild(title);
      body.appendChild(meta);

      card.appendChild(img);
      card.appendChild(body);
      trendingRow.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading movies:', error);
  }
}

loadTrending();

