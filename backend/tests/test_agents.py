from app.agents.ai_teacher import AITeacher
from app.agents.repository_analyst import RepositoryAnalyst
from app.agents.verification_agent import VerificationAgent


def test_agents_instantiate():
    assert RepositoryAnalyst() is not None
    assert AITeacher() is not None
    assert VerificationAgent() is not None
