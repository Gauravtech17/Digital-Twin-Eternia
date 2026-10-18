import math
from typing import Optional, Tuple, Dict, Any, List, Union
from datetime import datetime, timezone


def to_utc_datetime(dt: Union[datetime, str]) -> datetime:
    """
    Standardizes any datetime or ISO-8601 string to a timezone-aware UTC datetime.
    - If string: parses ISO format (handles 'Z' and explicit offsets).
    - If offset-naive datetime: interprets as UTC and attaches timezone.utc.
    - If offset-aware datetime: converts to timezone.utc.
    Ensures safe, deterministic subtraction and comparison across all engines.
    """
    if isinstance(dt, str):
        clean_str = dt.replace("Z", "+00:00")
        dt_parsed = datetime.fromisoformat(clean_str)
        if dt_parsed.tzinfo is None:
            return dt_parsed.replace(tzinfo=timezone.utc)
        return dt_parsed.astimezone(timezone.utc)
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    raise TypeError(f"Expected datetime or ISO string, got {type(dt)}")


def compute_ellipsoid_volume(
    length_mm: float,
    width_mm: float,
    depth_mm: Optional[float],
    missing_depth_assumption: Optional[str] = None,
) -> Tuple[Optional[float], str, str, bool]:
    """
    Computes ellipsoid volume: V = (pi/6) * L * W * D.
    If depth is missing:
      - Does NOT compute volume if no explicit assumption is provided.
      - If missing_depth_assumption == 'ASSUME_DEPTH_EQUALS_WIDTH', sets D = W with explicit assumption flag.
    Returns: (volume_mm3, formula_str, assumption_str, depth_assumed_bool)
    """
    if length_mm <= 0 or width_mm <= 0:
        return None, "(pi/6)*L*W*D", "Invalid dimensions", False

    actual_depth = depth_mm
    depth_assumed = False
    assumption_str = "None"

    if actual_depth is None or actual_depth <= 0:
        if missing_depth_assumption in ["ASSUME_DEPTH_EQUALS_WIDTH", "ASSUME_WIDTH", "D=W"]:
            actual_depth = width_mm
            depth_assumed = True
            assumption_str = "D = W (assumed prolate/oblate spheroid)"
        else:
            return None, "(pi/6)*L*W*D", "Depth missing: volume calculation omitted", False

    volume = (math.pi / 6.0) * length_mm * width_mm * actual_depth
    formula_str = "V = (pi/6) * L * W * D"
    return round(volume, 2), formula_str, assumption_str, depth_assumed


def compute_growth_rate(
    current_longest_mm: float,
    previous_longest_mm: float,
    current_date: Union[datetime, str],
    previous_date: Union[datetime, str],
) -> Tuple[Optional[float], Optional[int]]:
    """
    Computes growth rate in mm/month:
    Rate = ((L_curr - L_prev) / elapsed_days) * 30.4375 days/month
    Returns: (growth_rate_mm_per_month, elapsed_days)
    """
    d_curr = to_utc_datetime(current_date)
    d_prev = to_utc_datetime(previous_date)
    elapsed_seconds = (d_curr - d_prev).total_seconds()
    elapsed_days = int(round(elapsed_seconds / 86400.0))

    if elapsed_days <= 0:
        # Same-day or non-positive interval: cannot calculate longitudinal rate
        return None, 0

    delta_mm = current_longest_mm - previous_longest_mm
    rate_per_day = delta_mm / float(elapsed_days)
    rate_per_month = rate_per_day * 30.4375  # Standard astronomical/calendar month average
    return round(rate_per_month, 3), elapsed_days


def calculate_pixel_measurement(
    pixel_distance: float,
    mm_per_pixel: Optional[float],
) -> Tuple[float, str, bool]:
    """
    Calculates physical measurement from pixel distance.
    If mm_per_pixel is missing or not calibrated:
    Returns (pixel_distance, "px, uncalibrated", False)
    If calibrated:
    Returns (pixel_distance * mm_per_pixel, "mm", True)
    """
    if mm_per_pixel is None or mm_per_pixel <= 0:
        return round(pixel_distance, 1), "px, uncalibrated", False
    
    physical_mm = pixel_distance * mm_per_pixel
    return round(physical_mm, 2), "mm", True


def compute_linear_baseline_prediction(
    dates: List[Union[datetime, str]],
    values: List[float],
    horizon_days_list: List[int] = [30, 60, 90],
) -> List[Dict[str, Any]]:
    """
    Transparent experimental baseline: Ordinary Least Squares linear regression
    on longest dimension over elapsed days.
    Enabled only with >= 3 observations.
    Calculates prediction interval (95% approximate).
    """
    n = len(dates)
    if n < 3 or len(values) < 3:
        return []

    # Normalize all input dates to timezone-aware UTC
    dates_utc = [to_utc_datetime(d) for d in dates]
    t0 = dates_utc[0]
    x = [(d - t0).total_seconds() / 86400.0 for d in dates_utc]
    y = values

    x_mean = sum(x) / n
    y_mean = sum(y) / n

    ss_xx = sum((xi - x_mean) ** 2 for xi in x)
    ss_xy = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, y))

    if ss_xx == 0:
        # All observations at identical time
        return []

    slope = ss_xy / ss_xx
    intercept = y_mean - slope * x_mean

    # Residual sum of squares & standard error
    residuals = [yi - (intercept + slope * xi) for xi, yi in zip(x, y)]
    ss_res = sum(r ** 2 for r in residuals)
    df = max(1, n - 2)
    s_err = math.sqrt(ss_res / df)

    latest_date = dates[-1]
    latest_x = x[-1]

    predictions = []
    # Approximate t-critical for 95% (e.g. ~2.0 for reasonable degrees of freedom)
    t_crit = 2.0 if df >= 5 else 2.57

    for horizon in horizon_days_list:
        target_x = latest_x + horizon
        pred_y = intercept + slope * target_x
        
        # Standard error of prediction
        pred_se = s_err * math.sqrt(1.0 + (1.0 / n) + ((target_x - x_mean) ** 2 / ss_xx))
        margin = t_crit * pred_se

        projected_date = datetime.fromtimestamp(latest_date.timestamp() + horizon * 86400.0)

        predictions.append({
            "horizon_days": horizon,
            "projected_date": projected_date,
            "predicted_longest_dimension_mm": round(max(0.1, pred_y), 2),
            "lower_bound_mm": round(max(0.0, pred_y - margin), 2),
            "upper_bound_mm": round(pred_y + margin, 2),
            "model_type": "LINEAR_TREND_BASELINE",
            "provenance": "PREDICTED_EXPERIMENTAL",
        })

    return predictions
