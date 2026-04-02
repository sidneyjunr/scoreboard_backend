require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  JSONBIN_ID: process.env.JSONBIN_ID,
  JSONBIN_API_KEY: process.env.JSONBIN_API_KEY,
  SAVE_DEBOUNCE_MS: 3000,
  DEFAULT_DATA: {
    team1_name: 'TIME A',
    team1_score: 0,
    team1_fouls: 0,
    team1_logo: '',
    team1_bg_color: '#FF66C4',
    team1_name_color: '#FFFFFF',
    team1_stripe1_color: '#FFFFFF',
    team1_stripe2_color: '#000000',
    team2_name: 'TIME B',
    team2_score: 0,
    team2_fouls: 0,
    team2_logo: '',
    team2_bg_color: '#008CFF',
    team2_name_color: '#FFFFFF',
    team2_stripe1_color: '#FFFFFF',
    team2_stripe2_color: '#0000FF',
    period: '1º Quarto',
    foul_active_color: '#FACC15',
    foul_inactive_color: '#FFFFFF',
  },
};
