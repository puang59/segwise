"""
Clustering Models — KMeans, HDBSCAN, and GMM implementations.

Each function:
- Takes a preprocessed feature matrix (already imputed + scaled)
- Returns (labels_array, model_object, metadata_dict)
"""

import logging
import numpy as np
from typing import Tuple, Dict, Any, Optional

logger = logging.getLogger(__name__)


def run_kmeans(
    X: np.ndarray,
    n_clusters: Optional[int] = None,
    k_range: Tuple[int, int] = (2, 8),
    random_state: int = 42,
) -> Tuple[np.ndarray, Any, Dict[str, Any]]:
    """
    Run KMeans with automatic k selection via silhouette score.
    
    :param X: Preprocessed feature matrix (imputed + scaled).
    :param n_clusters: Fixed k if specified; otherwise auto-select via silhouette.
    :param k_range: (min_k, max_k) range to search over.
    :param random_state: Random seed.
    :return: (labels, best_model, metadata)
    """
    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score

    if n_clusters is not None:
        # Fixed k
        model = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
        labels = model.fit_predict(X)
        try:
            sil = float(silhouette_score(X, labels))
        except Exception:
            sil = float("nan")

        metadata = {
            "method": "kmeans",
            "k": n_clusters,
            "silhouette_score": round(sil, 4),
            "inertia": round(float(model.inertia_), 2),
        }
        return labels, model, metadata

    # Auto-select k
    best_k = k_range[0]
    best_score = -1.0
    best_model = None
    all_scores = {}

    for k in range(k_range[0], k_range[1] + 1):
        try:
            km = KMeans(n_clusters=k, random_state=random_state, n_init=10)
            lbs = km.fit_predict(X)
            sil = float(silhouette_score(X, lbs))
            all_scores[k] = round(sil, 4)
            logger.debug(f"[KMeans] k={k}, silhouette={sil:.4f}")
            if sil > best_score:
                best_score, best_k, best_model = sil, k, km
        except Exception as e:
            logger.warning(f"[KMeans] k={k} failed: {e}")

    if best_model is None:
        raise RuntimeError("[KMeans] All k values failed. Cannot cluster.")

    labels = best_model.labels_
    metadata = {
        "method": "kmeans",
        "k": best_k,
        "silhouette_score": round(best_score, 4),
        "inertia": round(float(best_model.inertia_), 2),
        "all_silhouette_scores": all_scores,
    }
    return labels, best_model, metadata


def run_hdbscan(
    X: np.ndarray,
    min_cluster_size: int = 50,
    min_samples: int = 10,
) -> Tuple[np.ndarray, Any, Dict[str, Any]]:
    """
    Run HDBSCAN density-based clustering.

    :param X: Preprocessed feature matrix.
    :param min_cluster_size: Minimum cluster size.
    :param min_samples: Core point minimum neighbours.
    :return: (labels, model, metadata). Label -1 = noise point.
    """
    import hdbscan
    from sklearn.metrics import silhouette_score

    model = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        prediction_data=True,
    )
    labels = model.fit_predict(X)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    noise_count = int((labels == -1).sum())

    sil = float("nan")
    if n_clusters >= 2:
        # Only compute silhouette on non-noise points
        mask = labels != -1
        if mask.sum() > n_clusters:
            try:
                sil = float(silhouette_score(X[mask], labels[mask]))
            except Exception:
                pass

    metadata = {
        "method": "hdbscan",
        "n_clusters": n_clusters,
        "noise_points": noise_count,
        "silhouette_score": round(sil, 4) if not np.isnan(sil) else None,
        "min_cluster_size": min_cluster_size,
        "min_samples": min_samples,
    }
    return labels, model, metadata


def run_gmm(
    X: np.ndarray,
    n_components_range: Tuple[int, int] = (2, 7),
    random_state: int = 42,
) -> Tuple[np.ndarray, Any, Dict[str, Any]]:
    """
    Run Gaussian Mixture Model with BIC-based model selection.

    :param X: Preprocessed feature matrix.
    :param n_components_range: Range of component counts to try.
    :param random_state: Random seed.
    :return: (labels, best_model, metadata).
    """
    from sklearn.mixture import GaussianMixture
    from sklearn.metrics import silhouette_score

    best_bic = np.inf
    best_n = n_components_range[0]
    best_model = None
    all_bics = {}

    for n in range(n_components_range[0], n_components_range[1] + 1):
        try:
            gmm = GaussianMixture(n_components=n, random_state=random_state, n_init=3)
            gmm.fit(X)
            bic = float(gmm.bic(X))
            all_bics[n] = round(bic, 2)
            logger.debug(f"[GMM] n={n}, BIC={bic:.2f}")
            if bic < best_bic:
                best_bic, best_n, best_model = bic, n, gmm
        except Exception as e:
            logger.warning(f"[GMM] n={n} failed: {e}")

    if best_model is None:
        raise RuntimeError("[GMM] All n values failed. Cannot cluster.")

    labels = best_model.predict(X)
    sil = float("nan")
    if best_n >= 2:
        try:
            sil = float(silhouette_score(X, labels))
        except Exception:
            pass

    metadata = {
        "method": "gmm",
        "n_components": best_n,
        "bic": round(best_bic, 2),
        "silhouette_score": round(sil, 4) if not np.isnan(sil) else None,
        "all_bic_scores": all_bics,
    }
    return labels, best_model, metadata


def compute_cluster_metrics(
    X: np.ndarray,
    labels: np.ndarray,
) -> Dict[str, Any]:
    """
    Compute comprehensive clustering evaluation metrics.

    :param X: Feature matrix used for clustering (preprocessed).
    :param labels: Cluster label array.
    :return: Dict of metric name → value.
    """
    from sklearn.metrics import (
        silhouette_score,
        davies_bouldin_score,
        calinski_harabasz_score,
    )

    metrics: Dict[str, Any] = {}

    # Filter out noise for HDBSCAN compatibility
    mask = labels != -1
    X_valid = X[mask]
    labels_valid = labels[mask]

    n_clusters = len(set(labels_valid))
    if n_clusters < 2:
        return {"error": "Need at least 2 clusters for metrics", "n_clusters": n_clusters}

    try:
        metrics["silhouette_score"] = round(float(silhouette_score(X_valid, labels_valid)), 4)
    except Exception as e:
        metrics["silhouette_score"] = None
        logger.warning(f"[Metrics] Silhouette failed: {e}")

    try:
        metrics["davies_bouldin_index"] = round(float(davies_bouldin_score(X_valid, labels_valid)), 4)
    except Exception as e:
        metrics["davies_bouldin_index"] = None

    try:
        metrics["calinski_harabasz_score"] = round(float(calinski_harabasz_score(X_valid, labels_valid)), 4)
    except Exception as e:
        metrics["calinski_harabasz_score"] = None

    # Cluster size distribution
    unique, counts = np.unique(labels_valid, return_counts=True)
    size_dist = {int(k): int(v) for k, v in zip(unique, counts)}
    metrics["cluster_sizes"] = size_dist
    metrics["n_clusters"] = n_clusters
    metrics["total_points"] = int(len(labels))
    metrics["noise_points"] = int((labels == -1).sum())

    return metrics
