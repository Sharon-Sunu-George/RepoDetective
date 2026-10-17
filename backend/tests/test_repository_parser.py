from app.services.repository_parser import RepositoryParser


def test_repository_parser_instantiates():
    assert RepositoryParser() is not None
