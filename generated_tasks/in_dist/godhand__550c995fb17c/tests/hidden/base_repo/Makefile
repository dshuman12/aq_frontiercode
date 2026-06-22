.PHONY: test-backend test-backend-auth test-backend-docker test-backend-auth-docker

test-backend:
	./server/scripts/test.sh

test-backend-auth:
	./server/scripts/test.sh server/tests/test_auth_user_flow.py

test-backend-docker:
	./server/scripts/test_docker.sh

test-backend-auth-docker:
	./server/scripts/test_docker.sh server/tests/test_auth_user_flow.py
