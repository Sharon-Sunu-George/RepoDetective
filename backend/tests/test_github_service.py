from app.services.github_service import GitHubService


def test_github_service_instantiates():
    assert GitHubService() is not None
