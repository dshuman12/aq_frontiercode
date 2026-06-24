.PHONY: install test lint fmt clean

install:
	pip install -e .[dev,server]

test:
	pytest -q

lint:
	python -m compileall -q src tests

fmt:
	python -m compileall -q src tests

clean:
	rm -rf .pytest_cache .coverage htmlcov dist build *.egg-info
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
