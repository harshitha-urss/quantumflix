const express = require('express');
const axios = require('axios');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    console.log('TMDB_API_KEY present?', !!apiKey);

    if (!apiKey) {
      return res.status(500).json({ message: 'TMDB API key is not configured.' });
    }

    const response = await axios.get('https://api.themoviedb.org/3/trending/movie/week', {
      params: {
        api_key: apiKey,
        language: 'en-US',
      },
    });

    const results = (response.data && response.data.results) || [];
    console.log('TMDB /movies response status:', response.status, 'results:', results.length);

    return res.status(200).json({ results });
  } catch (error) {
    console.error('TMDB /movies fetch error:', error?.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to fetch movies from TMDB.' });
  }
});

module.exports = router;

