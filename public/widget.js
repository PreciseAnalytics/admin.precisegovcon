// public/widget.js
(function() {
  const script = document.currentScript;
  const naics = script.dataset.naics || '';
  const limit = script.dataset.limit || '5';
  const theme = script.dataset.theme || 'light';
  
  const container = document.getElementById('precise-govcon-widget');
  if (!container) return;
  
  // Create widget container
  container.innerHTML = `
    <div class="precise-govcon-widget ${theme}">
      <div class="widget-header">
        <h3>🔍 Live Federal Opportunities</h3>
        <p>Powered by <a href="https://precisegovcon.com?ref=widget" target="_blank">PreciseGovCon.com</a></p>
      </div>
      <div class="widget-loading">Loading opportunities...</div>
    </div>
  `;
  
  // Add styles
  const styles = `
    .precise-govcon-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      background: ${theme === 'dark' ? '#1a202c' : '#ffffff'};
      color: ${theme === 'dark' ? '#ffffff' : '#1a202c'};
      max-width: 400px;
      margin: 20px 0;
    }
    .widget-header {
      border-bottom: 2px solid #ed8936;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .widget-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: bold;
    }
    .widget-header a {
      color: #ed8936;
      text-decoration: none;
      font-size: 14px;
    }
    .opportunity-item {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      cursor: pointer;
      transition: background 0.2s;
    }
    .opportunity-item:hover {
      background: ${theme === 'dark' ? '#2d3748' : '#f7fafc'};
    }
    .opportunity-title {
      font-weight: 600;
      margin-bottom: 5px;
    }
    .opportunity-meta {
      display: flex;
      gap: 10px;
      font-size: 12px;
      color: #718096;
    }
    .value-badge {
      background: #ed8936;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
    }
    .widget-footer {
      margin-top: 15px;
      text-align: center;
    }
    .cta-button {
      background: #ed8936;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
  `;
  
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  
  // Fetch opportunities
  fetch(`https://precisegovcon.com/api/public/opportunities?naics=${naics}&limit=${limit}`)
    .then(res => res.json())
    .then(data => {
      const loadingEl = container.querySelector('.widget-loading');
      if (data.opportunities.length === 0) {
        loadingEl.textContent = 'No opportunities found at this time.';
        return;
      }
      
      let html = '';
      data.opportunities.forEach(opp => {
        html += `
          <div class="opportunity-item" onclick="window.open('https://precisegovcon.com/opportunities/${opp.id}', '_blank')">
            <div class="opportunity-title">${opp.title}</div>
            <div class="opportunity-meta">
              <span>${opp.agency}</span>
              <span>💰 ${opp.value}</span>
              <span>📅 ${new Date(opp.response_deadline).toLocaleDateString()}</span>
            </div>
            ${opp.set_aside ? `<span class="value-badge">${opp.set_aside}</span>` : ''}
          </div>
        `;
      });
      
      html += `
        <div class="widget-footer">
          <a href="https://precisegovcon.com/signup?ref=widget&naics=${naics}" class="cta-button">
            Get Full Access →
          </a>
        </div>
      `;
      
      loadingEl.outerHTML = html;
    })
    .catch(err => {
      container.querySelector('.widget-loading').textContent = 'Failed to load opportunities.';
    });
})();