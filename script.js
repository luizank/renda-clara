const form = document.querySelector("#investment-form");
const errorMessage = document.querySelector("#form-error");
const resultsPeriod = document.querySelector("#results-period");
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
let currentSimulation;

const formatMoney = (value) => moneyFormatter.format(value);

function getSimulation() {
  const initialAmount = Number(form.elements.initialAmount.value);
  const monthlyContribution = Number(form.elements.monthlyContribution.value);
  const interestRate = Number(form.elements.interestRate.value);
  const ratePeriod = form.elements.ratePeriod.value;
  const investmentPeriod = Number(form.elements.investmentPeriod.value);
  const timePeriod = form.elements.timePeriod.value;

  if (
    !Number.isFinite(initialAmount) ||
    !Number.isFinite(monthlyContribution) ||
    !Number.isFinite(interestRate) ||
    !Number.isFinite(investmentPeriod) ||
    initialAmount < 0 ||
    monthlyContribution < 0 ||
    interestRate < 0 ||
    interestRate > 1000 ||
    investmentPeriod < 1 ||
    investmentPeriod > (timePeriod === "year" ? 100 : 1200)
  ) {
    throw new Error("Confira os valores: eles devem ser positivos e respeitar os limites indicados.");
  }

  const months = timePeriod === "year" ? investmentPeriod * 12 : investmentPeriod;
  const monthlyRate =
    ratePeriod === "year"
      ? Math.pow(1 + interestRate / 100, 1 / 12) - 1
      : interestRate / 100;
  const points = [{ month: 0, balance: initialAmount, invested: initialAmount }];
  let balance = initialAmount;

  for (let month = 1; month <= months; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    points.push({
      month,
      balance,
      invested: initialAmount + monthlyContribution * month,
    });
  }

  const totalInvested = initialAmount + monthlyContribution * months;
  return {
    balance,
    totalInvested,
    interestEarned: balance - totalInvested,
    months,
    points,
  };
}

function drawChart(points) {
  const canvas = document.querySelector("#growth-chart");
  const context = canvas.getContext("2d");
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(bounds.width, 1);
  const height = Math.max(bounds.height, 1);
  const padding = { top: 12, right: 4, bottom: 23, left: 42 };

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, width, height);

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(points[points.length - 1].balance, 1);
  const y = (value) => padding.top + chartHeight * (1 - value / maxValue);
  const x = (index) => padding.left + (index / (points.length - 1 || 1)) * chartWidth;

  context.font = '10px "DM Sans", sans-serif';
  context.textBaseline = "middle";
  context.textAlign = "right";

  for (let tick = 0; tick <= 2; tick += 1) {
    const value = (maxValue * tick) / 2;
    const position = y(value);
    context.beginPath();
    context.setLineDash([3, 4]);
    context.strokeStyle = "#e9eee8";
    context.moveTo(padding.left, position);
    context.lineTo(width - padding.right, position);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#8b978e";
    context.fillText(formatAxisValue(value), padding.left - 7, position);
  }

  const chartBottom = padding.top + chartHeight;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(x(index), y(point.invested));
    else context.lineTo(x(index), y(point.invested));
  });
  context.lineTo(x(points.length - 1), chartBottom);
  context.lineTo(x(0), chartBottom);
  context.closePath();
  context.fillStyle = "rgba(154, 184, 163, 0.3)";
  context.fill();

  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(x(index), y(point.balance));
    else context.lineTo(x(index), y(point.balance));
  });
  for (let index = points.length - 1; index >= 0; index -= 1) {
    context.lineTo(x(index), y(points[index].invested));
  }
  context.closePath();
  context.fillStyle = "rgba(35, 123, 85, 0.18)";
  context.fill();

  context.beginPath();
  points.forEach((point, index) => {
    const pointX = x(index);
    const pointY = y(point.invested);
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  });
  context.strokeStyle = "#9ab8a3";
  context.lineWidth = 1.5;
  context.stroke();

  context.beginPath();
  points.forEach((point, index) => {
    const pointX = x(index);
    const pointY = y(point.balance);
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  });
  context.strokeStyle = "#237b55";
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "#8b978e";
  context.fillText("Início", padding.left, height - 12);
  context.fillText("Ano  " + Math.ceil((points.length - 1) / 12), width - padding.right, height - 12);
}

function formatAxisValue(value) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}

function updateResults(simulation) {
  document.querySelector("#future-value").textContent = formatMoney(simulation.balance);
  document.querySelector("#invested-value").textContent = formatMoney(simulation.totalInvested);
  document.querySelector("#interest-value").textContent = formatMoney(simulation.interestEarned);
  resultsPeriod.textContent =
    simulation.months % 12 === 0
      ? `${simulation.months / 12} ${simulation.months / 12 === 1 ? "ano" : "anos"}`
      : `${simulation.months} ${simulation.months === 1 ? "mês" : "meses"}`;
  drawChart(simulation.points);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  try {
    currentSimulation = getSimulation();
    updateResults(currentSimulation);
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  }
});

const brapiBaseUrl = "https://brapi.dev/api/v2/stocks/quote";

function setupStocksScreen() {
    const quoteSymbols = ["PETR4", "VALE3", "ITUB4", "MGLU3"];
    const featuredSymbols = [...quoteSymbols];
    const quoteMap = new Map();
    const stockList = document.querySelector("#stock-list");
    const quotesStatus = document.querySelector("#quotes-status");
    const tickerForm = document.querySelector("#ticker-form");
    const tickerInput = document.querySelector("#ticker-symbol");
    const refreshQuotesButton = document.querySelector("#refresh-quotes");
    const loadMoreButton = document.querySelector("#load-more-stocks");
    const historyPanel = document.querySelector("#stock-history");
    const historyChart = document.querySelector("#stock-history-chart");
    const historyStatus = document.querySelector("#history-status");
    const historyCache = new Map();
    const stockSimulationForm = document.querySelector("#stock-simulation-form");
    const stockFormError = document.querySelector("#stock-form-error");
    const stockResults = document.querySelector("#stock-results");
    const stockReturnInput = stockSimulationForm.elements.historicalReturn;
    const stockReturnHint = document.querySelector("#stock-return-hint");
    let selectedStock;
    let quotesLoading = false;
    let historyController;
    let historyRequestId = 0;
    let searchController;
    let searchRequestId = 0;
    let searchTerm = "";
    let searchPage = 0;
    let searchTotalPages = 0;
    let selectedHistoryRange = "1mo";
    let currentHistoryPoints = [];
    let activeHistoryReturn = null;

    const historyRanges = {
      "1d": { label: "1D", range: "1d", interval: "5m" },
      "5d": { label: "5D", range: "5d", interval: "30m" },
      "1mo": { label: "1M", range: "1mo", interval: "1d" },
      "1y": { label: "1A", range: "1y", interval: "1d" },
      "5y": { label: "5A", range: "5y", interval: "1mo" },
    };

    function setQuotesStatus(message, isError = false) {
      quotesStatus.textContent = message;
      quotesStatus.classList.toggle("is-error", isError);
    }

    function setQuoteControlsDisabled(disabled) {
      quotesLoading = disabled;
      refreshQuotesButton.disabled = disabled;
      tickerForm.querySelector("button").disabled = disabled;
    }

    function formatQuoteTime(value) {
      const date = new Date(value);
      if (!value || Number.isNaN(date.getTime())) return "Cotação resumida da busca";
      return `Cotação em ${date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    function createStockCard(quote) {
      const data = quote.data;
      const card = document.createElement("article");
      card.className = "stock-item";

      const top = document.createElement("div");
      top.className = "stock-item-top";
      const identity = document.createElement("div");
      identity.className = "stock-identity";
      const symbol = document.createElement("strong");
      symbol.className = "stock-symbol";
      symbol.textContent = quote.symbol;
      const name = document.createElement("span");
      name.className = "stock-name";
      name.textContent = data.longName || data.shortName || quote.symbol;
      identity.append(symbol, name);

      const change = document.createElement("span");
      change.className = "stock-change";
      change.title = "Variação diária informada pela API";
      if (Number.isFinite(data.regularMarketChangePercent)) {
        const changePercent = data.regularMarketChangePercent;
        change.textContent = `${changePercent > 0 ? "+" : ""}${changePercent.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%`;
        if (changePercent > 0) change.classList.add("is-positive");
      } else {
        change.textContent = "Variação indisponível";
      }
      top.append(identity, change);

      const priceLine = document.createElement("div");
      priceLine.className = "stock-price-line";
      const price = document.createElement("strong");
      price.className = "stock-price";
      price.textContent = Number.isFinite(data.regularMarketPrice)
        ? formatMoney(data.regularMarketPrice)
        : "Preço indisponível";
      const selectButton = document.createElement("button");
      selectButton.className = "stock-select-button";
      selectButton.type = "button";
      selectButton.textContent = selectedStock?.symbol === quote.symbol ? "Ação selecionada" : "Ver histórico";
      selectButton.setAttribute("aria-pressed", String(selectedStock?.symbol === quote.symbol));
      selectButton.addEventListener("click", () => selectStock(quote.symbol));
      priceLine.append(price, selectButton);

      const time = document.createElement("p");
      time.className = "stock-quote-time";
      time.textContent = formatQuoteTime(data.regularMarketTime);

      card.append(top, priceLine, time);
      return card;
    }

    function renderStockList() {
      stockList.replaceChildren();
      for (const symbol of quoteSymbols) {
        const quote = quoteMap.get(symbol);
        if (quote) stockList.append(createStockCard(quote));
      }
    }

    function renderHistoryChart(points) {
        if (!points.length) return;
        const context = historyChart.getContext("2d");
        const bounds = historyChart.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        const width = Math.max(bounds.width, 1);
        const height = Math.max(bounds.height, 1);
        const padding = { top: 14, right: 8, bottom: 25, left: 52 };
        historyChart.width = Math.round(width * pixelRatio);
        historyChart.height = Math.round(height * pixelRatio);
        context.scale(pixelRatio, pixelRatio);
        context.clearRect(0, 0, width, height);

        const values = points.map((point) => point.price);
        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const spread = rawMax - rawMin;
        const paddingValue = spread === 0 ? Math.max(rawMax * 0.02, 0.01) : spread * 0.12;
        const minValue = Math.max(0, rawMin - paddingValue);
        const maxValue = rawMax + paddingValue;
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const x = (index) => padding.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
        const y = (value) => padding.top + ((maxValue - value) / (maxValue - minValue)) * chartHeight;

        context.font = '10px "DM Sans", sans-serif';
        context.textAlign = "right";
        context.textBaseline = "middle";
        for (let tick = 0; tick <= 2; tick += 1) {
          const value = minValue + ((maxValue - minValue) * tick) / 2;
          const position = y(value);
          context.beginPath();
          context.setLineDash([3, 4]);
          context.strokeStyle = "#e9eee8";
          context.moveTo(padding.left, position);
          context.lineTo(width - padding.right, position);
          context.stroke();
          context.setLineDash([]);
          context.fillStyle = "#8b978e";
          context.fillText(
            value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }),
            padding.left - 7,
            position,
          );
        }

        const isPositive = points[points.length - 1].price >= points[0].price;
        const color = isPositive ? "#237b55" : "#b44c42";
        context.beginPath();
        points.forEach((point, index) => {
          if (index === 0) context.moveTo(x(index), y(point.price));
          else context.lineTo(x(index), y(point.price));
        });
        context.lineTo(x(points.length - 1), padding.top + chartHeight);
        context.lineTo(x(0), padding.top + chartHeight);
        context.closePath();
        context.fillStyle = isPositive ? "rgba(35, 123, 85, 0.12)" : "rgba(180, 76, 66, 0.1)";
        context.fill();

        context.beginPath();
        points.forEach((point, index) => {
          if (index === 0) context.moveTo(x(index), y(point.price));
          else context.lineTo(x(index), y(point.price));
        });
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke();

        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillStyle = "#8b978e";
        context.fillText(formatHistoryDate(points[0].date, selectedHistoryRange), padding.left, height - 17);
        const endLabel = formatHistoryDate(points[points.length - 1].date, selectedHistoryRange);
        context.textAlign = "right";
        context.fillText(endLabel, width - padding.right, height - 17);
    }

    function formatHistoryDate(timestamp, range = "1mo") {
        const date = new Date(timestamp * 1000);
        const options = range === "1d"
          ? { hour: "2-digit", minute: "2-digit" }
          : range === "5d"
            ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
            : { day: "2-digit", month: "2-digit", year: "numeric" };
        return date.toLocaleString("pt-BR", options);
    }

    function selectStock(symbol) {
      const quote = quoteMap.get(symbol);
      if (!quote || !Number.isFinite(quote.data.regularMarketPrice) || quote.data.regularMarketPrice <= 0) {
        setQuotesStatus(`Não há cotação válida disponível para ${symbol}.`, true);
        return;
      }

      selectedStock = quote;
      const name = quote.data.longName || quote.data.shortName || quote.symbol;
      document.querySelector("#selected-stock-note").textContent =
        `${quote.symbol} — ${name}. Cotação atual: ${formatMoney(quote.data.regularMarketPrice)} por ação. ` +
        "Carregando o histórico de preços...";
      document.querySelector("#stock-history-title").textContent = `${quote.symbol} — ${name}`;
      document.querySelector("#history-current-price").textContent = formatMoney(quote.data.regularMarketPrice);
      historyPanel.hidden = false;
      stockResults.hidden = true;
      stockFormError.hidden = true;
      currentHistoryPoints = [];
      activeHistoryReturn = null;
      selectedHistoryRange = "1mo";
      document.querySelectorAll("[data-history-range]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.historyRange === selectedHistoryRange));
      });
      renderStockList();
      loadStockHistory(quote, selectedHistoryRange);
    }

    function updateHistorySummary(points, range) {
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      const changePercent = ((lastPoint.price / firstPoint.price) - 1) * 100;
      const change = document.querySelector("#history-return");
      change.textContent = `${changePercent >= 0 ? "+" : ""}${changePercent.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;
      change.classList.toggle("is-negative", changePercent < 0);
      document.querySelector("#history-dates").textContent =
        `${formatHistoryDate(firstPoint.date, range)} — ${formatHistoryDate(lastPoint.date, range)}`;
      historyChart.setAttribute(
        "aria-label",
        `Oscilação ${historyRanges[range].label}: ${change.textContent}, de ` +
        `${formatHistoryDate(firstPoint.date, range)} a ${formatHistoryDate(lastPoint.date, range)}`,
      );
      currentHistoryPoints = points;
      renderHistoryChart(points);
      return changePercent;
    }

    function updateStockSimulation() {
      if (!currentHistoryPoints.length || !Number.isFinite(activeHistoryReturn)) return;

      const investment = Number(stockSimulationForm.elements.investment.value);
      if (!Number.isFinite(investment) || investment <= 0) {
        stockFormError.textContent = "Informe um valor inicial maior que zero para ver a simulação.";
        stockFormError.hidden = false;
        stockResults.hidden = true;
        return;
      }

      stockFormError.hidden = true;
      const firstPoint = currentHistoryPoints[0];
      const lastPoint = currentHistoryPoints[currentHistoryPoints.length - 1];
      const shares = investment / firstPoint.price;
      const finalValue = shares * lastPoint.price;
      const gain = finalValue - investment;
      const range = historyRanges[selectedHistoryRange];
      const periodLabel = `${range.label} • ${formatHistoryDate(firstPoint.date, selectedHistoryRange)} — ${formatHistoryDate(lastPoint.date, selectedHistoryRange)}`;
      const currentPrice = selectedStock.data.regularMarketPrice;

      document.querySelector("#stock-future-value").textContent = formatMoney(finalValue);
      document.querySelector("#stock-invested-value").textContent = formatMoney(investment);
      document.querySelector("#stock-gain-value").textContent = formatMoney(gain);
      document.querySelector("#stock-share-count").textContent =
        `${shares.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ações`;
      document.querySelector("#stock-result-period").textContent = periodLabel;
      document.querySelector("#selected-stock-note").textContent =
        `${selectedStock.symbol}. Valor atual: ${formatMoney(currentPrice)} por ação. ` +
        `Oscilação ${range.label}: ${activeHistoryReturn >= 0 ? "+" : ""}${activeHistoryReturn.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%.`;
      stockResults.hidden = false;
    }

    async function loadStockHistory(quote, range) {
      if (historyController) historyController.abort();
      historyController = new AbortController();
      const requestId = ++historyRequestId;
      const controller = historyController;
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      const simulateButton = stockSimulationForm.querySelector('button[type="submit"]');
      const rangeConfig = historyRanges[range];
      currentHistoryPoints = [];
      activeHistoryReturn = null;
      stockResults.hidden = true;
      historyStatus.classList.remove("is-error");
      historyStatus.textContent = `Carregando histórico ${rangeConfig.label}...`;
      stockReturnInput.disabled = true;
      simulateButton.disabled = true;
      document.querySelectorAll("[data-history-range]").forEach((button) => {
        button.disabled = true;
      });
      stockReturnInput.value = "";
      stockReturnInput.placeholder = "Carregando período...";
      document.querySelector("#stock-return-label").textContent = `Variação no período ${rangeConfig.label} (%)`;
      stockReturnHint.textContent = `Consultando o histórico ajustado do período ${rangeConfig.label}...`;

      try {
        const cacheKey = `${quote.symbol}:${range}`;
        let prices = historyCache.get(cacheKey);
        let historyQuote;
        if (!prices) {
          const url = new URL(`https://brapi.dev/api/quote/${encodeURIComponent(quote.symbol)}`);
          url.searchParams.set("range", rangeConfig.range);
          url.searchParams.set("interval", rangeConfig.interval);
          const response = await fetch(url, {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          });
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.message || payload.error || `A API respondeu com o erro ${response.status}.`);
          }

          historyQuote = payload.results?.[0];
          const history = historyQuote?.historicalDataPrice;
          prices = Array.isArray(history)
            ? history
                .map((point) => ({
                  date: Number(point.date),
                  price: Number.isFinite(point.adjustedClose) ? point.adjustedClose : Number(point.close),
                }))
                .filter((point) => Number.isFinite(point.date) && Number.isFinite(point.price) && point.price > 0)
                .sort((first, second) => first.date - second.date)
            : [];

          if (prices.length < 2) {
            throw new Error("Não há pontos históricos suficientes para esse período.");
          }
          historyCache.set(cacheKey, prices);
        }

        if (requestId !== historyRequestId) return;
        const periodReturn = updateHistorySummary(prices, range);
        if (historyQuote && Number.isFinite(historyQuote.regularMarketPrice) && selectedStock?.symbol === quote.symbol) {
          selectedStock.data.regularMarketPrice = historyQuote.regularMarketPrice;
          document.querySelector("#history-current-price").textContent = formatMoney(historyQuote.regularMarketPrice);
        }
        activeHistoryReturn = periodReturn;
        historyStatus.textContent = `${prices.length} pontos históricos • variação no período de ${formatHistoryDate(prices[0].date, range)} a ${formatHistoryDate(prices[prices.length - 1].date, range)}.`;
        stockReturnInput.value = Number(periodReturn.toFixed(6)).toString();
        stockReturnInput.placeholder = "";
        stockReturnHint.textContent =
          `Retorno histórico de ${formatHistoryDate(prices[0].date, range)} a ${formatHistoryDate(prices[prices.length - 1].date, range)}. A simulação usa este mesmo período.`;
        updateStockSimulation();
        simulateButton.disabled = false;
      } catch (error) {
        if (requestId !== historyRequestId) return;
        const detail = error.name === "AbortError"
          ? "A consulta do histórico excedeu 15 segundos."
          : error instanceof TypeError
            ? "Não foi possível conectar à API de histórico."
            : error.message;
        historyStatus.textContent = `Não foi possível carregar este período: ${detail}`;
        historyStatus.classList.add("is-error");
        stockReturnHint.textContent = `Não foi possível obter a rentabilidade deste período. ${detail}`;
        stockReturnInput.placeholder = "Histórico indisponível";
        document.querySelector("#selected-stock-note").textContent =
          `${quote.symbol}: não foi possível calcular a simulação sem o histórico deste período.`;
      } finally {
        window.clearTimeout(timeoutId);
        if (requestId === historyRequestId) {
          document.querySelectorAll("[data-history-range]").forEach((button) => {
            button.disabled = false;
          });
          stockReturnInput.disabled = false;
          simulateButton.disabled = !Number.isFinite(activeHistoryReturn);
        }
      }
    }

    async function fetchQuotes(symbols, addSymbols = false) {
      if (quotesLoading) return;
      setQuoteControlsDisabled(true);
      setQuotesStatus("Consultando a brapi.dev...");
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);

      try {
        const url = new URL(brapiBaseUrl);
        url.searchParams.set("symbols", symbols.join(","));
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          const detail = payload.message || payload.error || `A API respondeu com o erro ${response.status}.`;
          throw new Error(detail);
        }

        if (!Array.isArray(payload.results) || payload.results.length === 0) {
          throw new Error("A API não encontrou cotações para esse ticker. Confira o código e tente novamente.");
        }

        const received = new Set();
        for (const quote of payload.results) {
          if (
            quote &&
            typeof quote.symbol === "string" &&
            quote.data &&
            Number.isFinite(quote.data.regularMarketPrice)
          ) {
            quoteMap.set(quote.symbol, quote);
            const requestedSymbol = quote.requestedSymbol || quote.symbol;
            quoteMap.set(requestedSymbol, quote);
            received.add(requestedSymbol);
            if (addSymbols && !quoteSymbols.includes(quote.symbol)) quoteSymbols.push(quote.symbol);
          }
        }

        if (received.size === 0) {
          throw new Error("A API não retornou preços válidos para os tickers solicitados.");
        }

        renderStockList();
        if (selectedStock && quoteMap.has(selectedStock.symbol)) {
          selectedStock = quoteMap.get(selectedStock.symbol);
        }

        const missing = symbols.filter((symbol) => !received.has(symbol));
        const updateTime = payload.requestedAt
          ? new Date(payload.requestedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : "";
        const status = missing.length
          ? `Ticker não encontrado: ${missing.join(", ")}.${updateTime ? ` Consulta feita às ${updateTime}.` : ""}`
          : `Cotações consultadas${updateTime ? ` às ${updateTime}` : ""}. O horário de cada cotação aparece no cartão.`;
        setQuotesStatus(status, missing.length > 0);
      } catch (error) {
        const detail = error.name === "AbortError"
          ? "A consulta excedeu 12 segundos. Tente novamente."
          : error instanceof TypeError
            ? "Não foi possível conectar à API. Verifique a conexão e se o provedor está disponível."
            : error.message;
        setQuotesStatus(`Erro ao consultar cotações: ${detail}`, true);
      } finally {
        window.clearTimeout(timeoutId);
        setQuoteControlsDisabled(false);
      }
    }

    async function searchStocks(query, page = 1, append = false) {
      if (searchController) searchController.abort();
      searchController = new AbortController();
      const requestId = ++searchRequestId;
      const controller = searchController;
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      const searchButton = tickerForm.querySelector("button");
      searchButton.disabled = true;
      loadMoreButton.disabled = true;
      setQuotesStatus(`Buscando ações para “${query}”...`);

      try {
        const url = new URL("https://brapi.dev/api/quote/list");
        url.searchParams.set("search", query);
        url.searchParams.set("type", "stock");
        url.searchParams.set("page", String(page));
        url.searchParams.set("limit", "10");
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || payload.error || `A API respondeu com o erro ${response.status}.`);
        }
        if (!Array.isArray(payload.stocks)) {
          throw new Error("A resposta da API não contém uma lista de ações válida.");
        }
        if (requestId !== searchRequestId) return;

        searchTerm = query;
        searchPage = page;
        searchTotalPages = Number(payload.totalPages) || 1;
        if (!append) {
          quoteSymbols.length = 0;
          stockList.replaceChildren();
        }

        for (const stock of payload.stocks) {
          if (typeof stock.stock !== "string" || !stock.stock) continue;
          const symbol = stock.stock.toUpperCase();
          const price = Number(stock.close);
          const changePercent = Number(stock.change);
          quoteMap.set(symbol, {
            symbol,
            requestedSymbol: symbol,
            data: {
              shortName: symbol,
              longName: stock.name || symbol,
              currency: "BRL",
              regularMarketPrice: Number.isFinite(price) ? price : null,
              regularMarketChangePercent: Number.isFinite(changePercent) ? changePercent : null,
              regularMarketTime: null,
            },
          });
          if (!quoteSymbols.includes(symbol)) quoteSymbols.push(symbol);
        }

        renderStockList();
        loadMoreButton.hidden = !payload.hasNextPage;
        const total = Number(payload.totalCount);
        if (quoteSymbols.length === 0) {
          setQuotesStatus(`Nenhuma ação encontrada para “${query}”. Tente um ticker ou nome diferente.`, true);
        } else {
          setQuotesStatus(
            `${Number.isFinite(total) ? total.toLocaleString("pt-BR") + " correspondência(s)" : "Resultados"} para “${query}” • página ${page} de ${searchTotalPages}.`,
          );
        }
      } catch (error) {
        if (requestId !== searchRequestId) return;
        const detail = error.name === "AbortError"
          ? "A busca excedeu 12 segundos."
          : error instanceof TypeError
            ? "Não foi possível conectar à busca de ações."
            : error.message;
        setQuotesStatus(`Erro ao buscar ações: ${detail}`, true);
        if (!append) {
          quoteSymbols.length = 0;
          stockList.replaceChildren();
        }
        loadMoreButton.hidden = true;
      } finally {
        window.clearTimeout(timeoutId);
        if (requestId === searchRequestId) {
          searchButton.disabled = false;
          loadMoreButton.disabled = false;
        }
      }
    }

    function showCurrentScreen() {
      const stocksVisible = window.location.hash === "#acoes";
      document.querySelector("#home-screen").hidden = stocksVisible;
      document.querySelector("#stocks-screen").hidden = !stocksVisible;
      for (const link of document.querySelectorAll("[data-screen-link]")) {
        const active = link.dataset.screenLink === (stocksVisible ? "stocks" : "home");
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }

      document.title = stocksVisible
        ? "Ações e simulação — Renda Clara"
        : "Renda Clara — Calculadora de juros compostos";
      if (stocksVisible && quoteMap.size === 0 && !quotesLoading) {
        fetchQuotes(quoteSymbols);
      }
      window.scrollTo(0, 0);
    }

    tickerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = tickerInput.value.trim();
      if (query.length < 2) {
        setQuotesStatus("Digite pelo menos 2 caracteres de um ticker ou nome de empresa.", true);
        tickerInput.focus();
        return;
      }

      searchStocks(query, 1, false);
    });

    refreshQuotesButton.addEventListener("click", () => {
      if (searchTerm) searchStocks(searchTerm, searchPage || 1, false);
      else fetchQuotes(featuredSymbols);
    });

    loadMoreButton.addEventListener("click", () => {
      if (searchTerm && searchPage < searchTotalPages) {
        searchStocks(searchTerm, searchPage + 1, true);
      }
    });

    document.querySelectorAll("[data-history-range]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!selectedStock) return;
        selectedHistoryRange = button.dataset.historyRange;
        document.querySelectorAll("[data-history-range]").forEach((rangeButton) => {
          rangeButton.setAttribute(
            "aria-pressed",
            String(rangeButton.dataset.historyRange === selectedHistoryRange),
          );
        });
        loadStockHistory(selectedStock, selectedHistoryRange);
      });
    });

    stockSimulationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      updateStockSimulation();
    });

    stockSimulationForm.elements.investment.addEventListener("input", () => {
      if (currentHistoryPoints.length) updateStockSimulation();
    });

    window.addEventListener("hashchange", showCurrentScreen);
    window.addEventListener("resize", () => {
      if (currentHistoryPoints.length && !historyPanel.hidden) {
        renderHistoryChart(currentHistoryPoints);
      }
    });
    showCurrentScreen();
}

setupStocksScreen();

window.addEventListener("resize", () => {
  drawChart(currentSimulation.points);
});

currentSimulation = getSimulation();
updateResults(currentSimulation);
